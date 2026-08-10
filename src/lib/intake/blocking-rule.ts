import { toDpaRole, type PartyRoleValue } from "./role-mapping";
import type { PartySideValue } from "./company-match";

export type GapSeverityValue = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type GapStatusValue = "OPEN" | "DRAFTED" | "RESOLVED" | "DISMISSED";

export interface GapState {
  severity: GapSeverityValue;
  status: GapStatusValue;
  dismissReason: string | null;
  /** Τύπος αυτόματης κάλυψης, αν υπάρχει — βλ. `src/lib/remedy/`. */
  remedyType: string | null;
}

export interface PartyState {
  side: PartySideValue;
  confirmedRole: PartyRoleValue | null;
}

export interface CommitVerdict {
  allowed: boolean;
  /** Όλοι οι λόγοι, όχι μόνο ο πρώτος — ο χρήστης πρέπει να τους δει μαζί. */
  reasons: string[];
}

/**
 * Πότε επιτρέπεται να κλείσει το intake και να δημιουργηθεί `Project`.
 *
 * Τα κρίσιμα κενά πρέπει να είναι τουλάχιστον σε πρόχειρο ή να έχουν
 * απορριφθεί με γραπτή αιτιολογία: σε έλεγχο, το «το αγνοήσαμε» χρειάζεται
 * υπογραφή. Η πλήρης επίλυσή τους απαιτείται αργότερα, στο κλείσιμο του έργου.
 */
export function canCommit(parties: PartyState[], gaps: GapState[]): CommitVerdict {
  const reasons: string[] = [];

  const ours = parties.filter((p) => p.side !== "EXTERNAL");
  if (ours.length === 0) {
    reasons.push("Καμία δική μας εταιρία δεν εντοπίστηκε στη σύμβαση.");
  }

  if (parties.length > 0 && parties.every((p) => p.side !== "EXTERNAL")) {
    reasons.push("Δεν εντοπίστηκε αντισυμβαλλόμενος — χωρίς τρίτο μέρος δεν προκύπτει σύμβαση επεξεργασίας.");
  }

  if (parties.filter((p) => p.side === "OWN_MOTHER").length > 1) {
    reasons.push("Περισσότερα από ένα μέρη σημειώθηκαν ως η μαμά εταιρία.");
  }

  if (parties.some((p) => !p.confirmedRole)) {
    reasons.push("Κάθε μέρος πρέπει να έχει επιβεβαιωμένο ρόλο.");
  }

  // Οι ρόλοι πρέπει να ΣΥΝΔΥΑΖΟΝΤΑΙ, όχι απλώς να υπάρχουν. Ένα μοντέλο μπορεί
  // να δώσει CONTROLLER και στις δύο πλευρές ενώ η αιτιολόγησή του περιγράφει
  // σχέση εκτελούντος — παρατηρήθηκε σε πραγματική δοκιμή. Χωρίς έγκυρο ζεύγος
  // δεν παράγεται καμία σύμβαση επεξεργασίας, και το commit θα δημιουργούσε
  // σιωπηλά έργο χωρίς κανένα DpaContract.
  const ourRoles = parties.filter((p) => p.side !== "EXTERNAL" && p.confirmedRole);
  const theirRoles = parties.filter((p) => p.side === "EXTERNAL" && p.confirmedRole);
  if (ourRoles.length > 0 && theirRoles.length > 0) {
    const anyValidPair = ourRoles.some((o) =>
      theirRoles.some((t) => toDpaRole(o.confirmedRole, t.confirmedRole) !== null)
    );
    if (!anyValidPair) {
      reasons.push(
        "Κανένας συνδυασμός ρόλων δεν αντιστοιχεί σε σύμβαση επεξεργασίας — έλεγξε τους ρόλους."
      );
    }
  }

  for (const gap of gaps) {
    if (gap.severity !== "CRITICAL") continue;
    // Ένα κρίσιμο κενό με προτεινόμενη κάλυψη δεν μπλοκάρει: το σύστημα
    // πρόκειται να το κλείσει μόνο του (βλ. commitIntake → executeAllRemedies).
    // Μπλοκάρει μόνο το κενό που ΚΑΝΕΝΑΣ δεν πρόκειται να καλύψει.
    if (gap.status === "OPEN" && !gap.remedyType) {
      reasons.push(
        "Υπάρχει κρίσιμο κενό χωρίς προτεινόμενη κάλυψη — πρέπει να αντιμετωπιστεί ή να απορριφθεί με αιτιολογία."
      );
    }
    if (gap.status === "DISMISSED" && !gap.dismissReason?.trim()) {
      reasons.push("Η απόρριψη κρίσιμου κενού απαιτεί γραπτή αιτιολογία.");
    }
  }

  return { allowed: reasons.length === 0, reasons };
}
