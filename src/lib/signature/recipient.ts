/**
 * Πού πάει πραγματικά ένα email υπογραφής.
 *
 * Τα μηνύματα αυτού του σταδίου απευθύνονται σε πελάτες, και μια λάθος
 * αποστολή δεν ανακαλείται. Η δικλείδα είναι μηχανισμός, όχι προσοχή: όσο η
 * `SIGNATURE_TEST_RECIPIENT` υπάρχει, τίποτα δεν φτάνει σε τρίτον.
 *
 * Καθαρή συνάρτηση, ώστε ο ισχυρισμός «ποτέ δεν διαρρέει» να δοκιμάζεται.
 */

export interface Recipient {
  name: string;
  email: string;
}

export interface ResolvedRecipient {
  to: string;
  redirected: boolean;
  /** Μπαίνει στην κορυφή του μηνύματος όταν υπάρχει ανακατεύθυνση. */
  notice: string | null;
}

export function resolveRecipient(
  intended: Recipient,
  override: string | undefined | null
): ResolvedRecipient {
  const guard = override?.trim();
  if (!guard) {
    return { to: intended.email.trim(), redirected: false, notice: null };
  }
  return {
    to: guard,
    redirected: true,
    notice:
      `⚠ ΔΟΚΙΜΑΣΤΙΚΗ ΑΠΟΣΤΟΛΗ — το κανονικό μήνυμα θα πήγαινε στον/στην ` +
      `«${intended.name}» <${intended.email.trim()}>.`,
  };
}

/** Η τρέχουσα ρύθμιση, για να τη δείχνει και το UI. */
export function signatureTestRecipient(): string | null {
  return process.env.SIGNATURE_TEST_RECIPIENT?.trim() || null;
}
