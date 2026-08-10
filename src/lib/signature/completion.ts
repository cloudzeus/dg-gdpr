export type SignatureStatusValue = "PENDING" | "SENT" | "VIEWED" | "SIGNED" | "DECLINED" | "EXPIRED";
export type GapSeverityValue = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type GapStatusValue = "OPEN" | "DRAFTED" | "RESOLVED" | "DISMISSED";

export interface SignatureState {
  status: string;
  recipientName: string;
  declineReason: string | null;
}

export interface GapState {
  severity: string;
  status: string;
  dismissReason: string | null;
}

export interface CompletionVerdict {
  allowed: boolean;
  /** Όλοι οι λόγοι, όχι μόνο ο πρώτος — ο χρήστης πρέπει να τους δει μαζί. */
  reasons: string[];
}

/**
 * Πότε επιτρέπεται να κλείσει το έργο (`Project.status = COMPLETED`).
 *
 * Αυστηρότερο από το `canCommit`: εκεί ένα κρίσιμο κενό με προτεινόμενη
 * κάλυψη δεν μπλόκαρε, γιατί το σύστημα επρόκειτο να το εκτελέσει στο
 * commit. Εδώ πρέπει να έχει όντως εκτελεστεί — `RESOLVED`, όχι απλώς
 * `DRAFTED` — και κάθε αίτημα υπογραφής πρέπει να έχει πράγματι υπογραφεί.
 */
export function canCompleteProject(signatures: SignatureState[], gaps: GapState[]): CompletionVerdict {
  const reasons: string[] = [];

  for (const sig of signatures) {
    if (sig.status === "SIGNED") continue;
    if (sig.status === "DECLINED") {
      reasons.push(
        `Ο/Η «${sig.recipientName}» αρνήθηκε την υπογραφή: ${sig.declineReason?.trim() || "χωρίς δηλωμένο λόγο"}.`
      );
      continue;
    }
    reasons.push(
      `Υπάρχει εκκρεμής υπογραφή (κατάσταση: ${sig.status}) — το έργο δεν κλείνει όσο εκκρεμεί υπογραφή.`
    );
  }

  for (const gap of gaps) {
    if (gap.severity !== "CRITICAL") continue;
    if (gap.status === "RESOLVED") continue;
    if (gap.status === "DISMISSED" && gap.dismissReason?.trim()) continue;
    reasons.push(
      "Υπάρχει κρίσιμο κενό που δεν έχει επιλυθεί πλήρως — στο κλείσιμο του έργου δεν αρκεί το πρόχειρο."
    );
  }

  return { allowed: reasons.length === 0, reasons };
}
