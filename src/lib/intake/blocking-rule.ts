import type { PartyRoleValue } from "./role-mapping";
import type { PartySideValue } from "./company-match";

export type GapSeverityValue = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type GapStatusValue = "OPEN" | "DRAFTED" | "RESOLVED" | "DISMISSED";

export interface GapState {
  severity: GapSeverityValue;
  status: GapStatusValue;
  dismissReason: string | null;
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

  for (const gap of gaps) {
    if (gap.severity !== "CRITICAL") continue;
    if (gap.status === "OPEN") {
      reasons.push("Υπάρχει κρίσιμο κενό συμμόρφωσης που δεν έχει αντιμετωπιστεί.");
    }
    if (gap.status === "DISMISSED" && !gap.dismissReason?.trim()) {
      reasons.push("Η απόρριψη κρίσιμου κενού απαιτεί γραπτή αιτιολογία.");
    }
  }

  return { allowed: reasons.length === 0, reasons };
}
