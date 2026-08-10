import { normalizeVat, isValidGreekVat } from "./vat";

export type PartySideValue = "OWN_MOTHER" | "OWN_GROUP" | "EXTERNAL";
export type MatchMethodValue = "VAT" | "NAME" | "MANUAL" | "NONE";

export interface MatchCandidate {
  /** `Company.id`, ή το σταθερό "org" για τη μαμά εταιρία. */
  id: string;
  name: string;
  legalName: string | null;
  vatNumber: string | null;
  side: PartySideValue;
}

export interface ExtractedParty {
  name: string;
  vat: string | null;
}

export interface PartyMatch {
  candidateId: string;
  method: MatchMethodValue;
  score: number;
  side: PartySideValue;
}

/**
 * Ελληνικοί χαρακτήρες οπτικά ταυτόσημοι με λατινικούς.
 *
 * Η κατεύθυνση είναι ελληνικά → λατινικά, όχι το αντίστροφο: έτσι ένα καθαρά
 * λατινικό όνομα («DGSOFT») μένει αναγνώσιμο στο κλειδί σύγκρισης, ενώ το
 * «ΚΟΣΜΟΚΑΡ» και το OCR-μαγκλαρισμένο «KOΣMOKAP» καταλήγουν στο ίδιο κλειδί.
 */
const GREEK_TO_LATIN: Record<string, string> = {
  Α: "A", Β: "B", Ε: "E", Ζ: "Z", Η: "H", Ι: "I", Κ: "K",
  Μ: "M", Ν: "N", Ο: "O", Ρ: "P", Τ: "T", Χ: "X", Υ: "Y",
  α: "a", β: "b", ε: "e", ζ: "z", η: "h", ι: "i", κ: "k",
  μ: "m", ν: "n", ο: "o", ρ: "p", τ: "t", χ: "x", υ: "y",
};

function foldLookalikes(s: string): string {
  return [...s].map((ch) => GREEK_TO_LATIN[ch] ?? ch).join("");
}

/**
 * Νομικές μορφές, συντομογραφίες και ολογράφως — περασμένες από την ΙΔΙΑ
 * αναδίπλωση ώστε να ταιριάζουν με το κανονικοποιημένο κείμενο.
 */
const LEGAL_FORMS = [
  "ανωνυμος εταιρεια", "ανωνυμη εταιρεια", "ανωνυμος εταιρια",
  "ετερορρυθμη εταιρεια", "ομορρυθμη εταιρεια",
  "ιδιωτικη κεφαλαιουχικη εταιρεια",
  "εταιρεια περιορισμενης ευθυνης",
  "μονοπροσωπη", "μον",
  "αε", "εε", "οε", "επε", "ικε", "ιμε",
  "sa", "ltd", "llc", "gmbh", "plc", "inc", "bv", "ab", "oy",
].map(foldLookalikes);

/**
 * Κανονικοποιεί επωνυμία σε κλειδί σύγκρισης: πεζά, χωρίς τόνους, χωρίς
 * νομική μορφή, χωρίς στίξη, με ενιαία κενά.
 *
 * Οι τελείες ΑΦΑΙΡΟΥΝΤΑΙ αντί να γίνουν κενά, αλλιώς το «Α.Ε.» θα κατέληγε
 * «α ε» και δεν θα αναγνωριζόταν ως νομική μορφή.
 */
export function normalizeCompanyName(raw: string | null | undefined): string {
  if (!raw) return "";

  let s = raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // τόνοι και διαλυτικά
    .toLowerCase();

  s = foldLookalikes(s);

  s = s
    .replace(/\./g, "")
    // Κάθε μορφή παύλας, όχι μόνο το ενωτικό: τα μοντέλα επιστρέφουν συχνά το
    // όνομα μαζί με τον διαχωριστή του prompt («DGSOFT ΕΕ —»), και τότε η
    // αντιστοίχιση αποτυγχάνει σιωπηλά.
    .replace(/[,·''""()\-‐-―_/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Η νομική μορφή αφαιρείται μόνο ως ΞΕΧΩΡΙΣΤΗ λέξη, ώστε το «ΑΕΡΟΠΟΡΙΑ»
  // να μη χάσει το «ΑΕ» του.
  for (const form of LEGAL_FORMS) {
    const escaped = form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    s = s
      .replace(new RegExp(`(^|\\s)${escaped}(\\s|$)`, "g"), " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return s;
}

/**
 * Βρίσκει τον υποψήφιο που αντιστοιχεί σε ένα εξαχθέν μέρος.
 * ΑΦΜ πρώτα (score 1), όνομα δεύτερο (score 0.8). `null` αν δεν ταιριάζει.
 */
export function matchParty(
  party: ExtractedParty,
  candidates: MatchCandidate[]
): PartyMatch | null {
  // Το ψηφίο ελέγχου ΠΡΕΠΕΙ να επαληθευτεί πριν δεχθούμε ταίριασμα με ΑΦΜ.
  // Το `normalizeVat` καθαρίζει μορφή, δεν κρίνει αν ο αριθμός είναι ΑΦΜ:
  // μια ημερομηνία ή ένας αριθμός παραστατικού έχουν κι αυτά ψηφία και
  // διαχωριστικά. Ο έλεγχος κόβει περίπου το 90% των τυχαίων ψηφίων. Δεν
  // είναι τέλειος — περίπου 1 στα 10 περνά τυχαία — γι' αυτό η τελική άμυνα
  // παραμένει η ανθρώπινη επιβεβαίωση στο βήμα 4 του wizard.
  const vat = normalizeVat(party.vat);
  if (vat && isValidGreekVat(vat)) {
    const hits = candidates.filter((c) => normalizeVat(c.vatNumber) === vat);
    // Το Company.vatNumber είναι @unique, οπότε σύγκρουση σημαίνει ότι η μαμά
    // υπάρχει και ως εγγραφή Company. Προτιμάμε τη δική μας πλευρά: το «αυτοί
    // είμαστε εμείς» είναι η πιο βαριά πληροφορία και δεν πρέπει να εξαρτάται
    // από τη σειρά του πίνακα.
    const hit = hits.find((c) => c.side !== "EXTERNAL") ?? hits[0];
    if (hit) return { candidateId: hit.id, method: "VAT", score: 1, side: hit.side };
  }

  const name = normalizeCompanyName(party.name);
  if (name) {
    const hits = candidates.filter(
      (c) =>
        normalizeCompanyName(c.name) === name ||
        normalizeCompanyName(c.legalName) === name
    );

    // Ένα ταίριασμα: το δεχόμαστε. Περισσότερα: ΔΕΝ μαντεύουμε. Δύο εταιρίες
    // μπορούν κάλλιστα να λέγονται «ΑΛΦΑ» με διαφορετικό ΑΦΜ, και η επιλογή
    // «όποια βρέθηκε πρώτη» εξαρτάται από τη σειρά του πίνακα. Το μέρος
    // επιστρέφεται ως αταίριαστο και το λύνει ο άνθρωπος στο βήμα 4 — μια
    // λανθασμένη αντιστοίχιση φαίνεται σωστή και δεν ξανακοιτάζεται ποτέ.
    if (hits.length === 1) {
      return { candidateId: hits[0].id, method: "NAME", score: 0.8, side: hits[0].side };
    }
  }

  return null;
}
