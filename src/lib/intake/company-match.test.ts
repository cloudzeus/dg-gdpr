import { describe, it, expect } from "vitest";
import { normalizeCompanyName, matchParty, type MatchCandidate } from "./company-match";

const MOTHER: MatchCandidate = {
  id: "org",
  name: "DGSOFT",
  legalName: "DGSOFT ΕΕ",
  vatNumber: "997939640",
  side: "OWN_MOTHER",
};
const SUBSIDIARY: MatchCandidate = {
  id: "sub1",
  name: "DG Smart",
  legalName: "DG SMART ΙΚΕ",
  vatNumber: "094014201",
  side: "OWN_GROUP",
};
const CLIENT: MatchCandidate = {
  id: "c1",
  name: "ΚΟΣΜΟΚΑΡ",
  legalName: "ΚΟΣΜΟΚΑΡ ΑΝΩΝΥΜΟΣ ΕΤΑΙΡΕΙΑ",
  vatNumber: "094059163",
  side: "EXTERNAL",
};
const ALL = [MOTHER, SUBSIDIARY, CLIENT];

describe("normalizeCompanyName", () => {
  // Η κανονικοποιημένη μορφή είναι ΚΛΕΙΔΙ ΣΥΓΚΡΙΣΗΣ, όχι κείμενο προς εμφάνιση.
  // Γι' αυτό οι περισσότερες δοκιμές ελέγχουν ΙΣΟΤΗΤΕΣ ανάμεσα σε γραφές του
  // ίδιου ονόματος — αυτό είναι το πραγματικό συμβόλαιο. Το να καρφώσουμε την
  // ακριβή εσωτερική μορφή θα έδενε τις δοκιμές σε λεπτομέρεια υλοποίησης.

  it("ονόματα με λατινικούς χαρακτήρες μένουν αναγνώσιμα", () => {
    expect(normalizeCompanyName("DGSOFT")).toBe("dgsoft");
    expect(normalizeCompanyName("  DG   SMART,  ")).toBe("dg smart");
  });

  it("αγνοεί πεζά/κεφαλαία και τόνους", () => {
    expect(normalizeCompanyName("Κοσμοκάρ")).toBe(normalizeCompanyName("ΚΟΣΜΟΚΑΡ"));
  });

  it.each([
    ["ΚΟΣΜΟΚΑΡ Α.Ε.", "ΚΟΣΜΟΚΑΡ"],
    ["DGSOFT Ε.Ε.", "DGSOFT"],
    ["DG SMART Ι.Κ.Ε.", "DG SMART"],
    ["Παπαδόπουλος Ο.Ε.", "Παπαδόπουλος"],
    ["ΑΛΦΑ ΕΠΕ", "ΑΛΦΑ"],
    ["ΒΗΤΑ ΜΟΝΟΠΡΟΣΩΠΗ ΙΚΕ", "ΒΗΤΑ"],
    ["Gamma Ltd", "Gamma"],
  ])("αφαιρεί τη νομική μορφή: %s ≡ %s", (withForm, without) => {
    expect(normalizeCompanyName(withForm)).toBe(normalizeCompanyName(without));
  });

  it("αφαιρεί την ολογράφως νομική μορφή", () => {
    expect(normalizeCompanyName("ΚΟΣΜΟΚΑΡ ΑΝΩΝΥΜΟΣ ΕΤΑΙΡΕΙΑ"))
      .toBe(normalizeCompanyName("ΚΟΣΜΟΚΑΡ"));
  });

  it("ενοποιεί ελληνικά και λατινικά ομόγραφα", () => {
    // «KOΣMOKAP» με λατινικά K, O, M, A, P — τυπικό σφάλμα OCR
    expect(normalizeCompanyName("KOΣMOKAP")).toBe(normalizeCompanyName("ΚΟΣΜΟΚΑΡ"));
  });

  it("ΔΕΝ αφαιρεί νομική μορφή που είναι μέρος λέξης", () => {
    // «ΑΕΡΟΠΟΡΙΑ» ξεκινά με «ΑΕ» αλλά δεν είναι ανώνυμη εταιρεία
    expect(normalizeCompanyName("ΑΕΡΟΠΟΡΙΑ")).not.toBe(normalizeCompanyName("ΡΟΠΟΡΙΑ"));
    expect(normalizeCompanyName("ΑΕΡΟΠΟΡΙΑ").length).toBeGreaterThan(5);
  });

  it("ξεχωρίζει διαφορετικές εταιρίες", () => {
    expect(normalizeCompanyName("ΚΟΣΜΟΚΑΡ")).not.toBe(normalizeCompanyName("ΑΛΦΑ"));
  });

  it("επιστρέφει κενό για άκυρη είσοδο", () => {
    expect(normalizeCompanyName(null)).toBe("");
    expect(normalizeCompanyName(undefined)).toBe("");
    expect(normalizeCompanyName("   ")).toBe("");
    expect(normalizeCompanyName("Α.Ε.")).toBe("");
  });
});

describe("matchParty", () => {
  it("ταιριάζει με ΑΦΜ και επιστρέφει score 1", () => {
    const m = matchParty({ name: "οτιδήποτε", vat: "997939640" }, ALL);
    expect(m).toMatchObject({ candidateId: "org", method: "VAT", score: 1, side: "OWN_MOTHER" });
  });

  it("το ΑΦΜ υπερισχύει του ονόματος όταν διαφωνούν", () => {
    const m = matchParty({ name: "ΚΟΣΜΟΚΑΡ", vat: "997939640" }, ALL);
    expect(m?.candidateId).toBe("org");
  });

  it("καθαρίζει το ΑΦΜ πριν συγκρίνει", () => {
    const m = matchParty({ name: "-", vat: "EL 997-939-640" }, ALL);
    expect(m?.candidateId).toBe("org");
  });

  it("ταιριάζει με όνομα όταν λείπει ΑΦΜ", () => {
    const m = matchParty({ name: "ΚΟΣΜΟΚΑΡ Α.Ε.", vat: null }, ALL);
    expect(m).toMatchObject({ candidateId: "c1", method: "NAME", side: "EXTERNAL" });
  });

  it("ταιριάζει με τη νομική επωνυμία", () => {
    const m = matchParty({ name: "ΚΟΣΜΟΚΑΡ ΑΝΩΝΥΜΟΣ ΕΤΑΙΡΕΙΑ", vat: null }, ALL);
    expect(m?.candidateId).toBe("c1");
  });

  it("εντοπίζει θυγατρική του ομίλου", () => {
    const m = matchParty({ name: "DG SMART ΙΚΕ", vat: null }, ALL);
    expect(m).toMatchObject({ candidateId: "sub1", side: "OWN_GROUP" });
  });

  it("επιστρέφει null όταν δεν ταιριάζει τίποτα", () => {
    expect(matchParty({ name: "ΑΓΝΩΣΤΗ ΕΤΑΙΡΙΑ", vat: null }, ALL)).toBeNull();
  });

  it("επιστρέφει null για ΑΦΜ που δεν υπάρχει και όνομα άγνωστο", () => {
    expect(matchParty({ name: "Άλλο", vat: "123456789" }, ALL)).toBeNull();
  });

  it("ΔΕΝ ταιριάζει με ΑΦΜ που κόβεται στο ψηφίο ελέγχου", () => {
    // Ίδια ψηφία και στις δύο πλευρές, αλλά άκυρο ΑΦΜ: αν το δεχόμασταν, ένα
    // σφάλμα OCR θα έδενε τη σύμβαση σε λάθος εταιρία.
    const bad: MatchCandidate = {
      id: "bad", name: "Χ", legalName: null, vatNumber: "997939641", side: "EXTERNAL",
    };
    expect(matchParty({ name: "άσχετο όνομα", vat: "997939641" }, [bad])).toBeNull();
  });

  it("πέφτει πίσω στο όνομα όταν το ΑΦΜ είναι άκυρο", () => {
    const c: MatchCandidate = {
      id: "c9", name: "ΚΟΣΜΟΚΑΡ", legalName: null, vatNumber: "997939641", side: "EXTERNAL",
    };
    const m = matchParty({ name: "ΚΟΣΜΟΚΑΡ Α.Ε.", vat: "997939641" }, [c]);
    expect(m).toMatchObject({ candidateId: "c9", method: "NAME" });
  });

  it("δεν ταιριάζει σε κενή λίστα υποψηφίων", () => {
    expect(matchParty({ name: "DGSOFT", vat: "997939640" }, [])).toBeNull();
  });

  it("αγνοεί υποψήφιους χωρίς ΑΦΜ κατά την αντιστοίχιση ΑΦΜ", () => {
    const noVat: MatchCandidate = { id: "x", name: "Χ", legalName: null, vatNumber: null, side: "EXTERNAL" };
    expect(matchParty({ name: "άσχετο", vat: "111111111" }, [noVat])).toBeNull();
  });
});
