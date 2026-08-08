/**
 * Ελέγχει αν ένα email ανήκει σε εγκεκριμένο domain του οργανισμού.
 *
 * Χρησιμοποιείται ΜΟΝΟ για την αυτόματη εγγραφή νέων χρηστών που μπαίνουν με
 * Microsoft Entra. Χρήστες που υπάρχουν ήδη στη βάση δεν περνούν από εδώ —
 * η πρόσβασή τους κρίνεται από το `isActive`.
 */

/** Κανονικοποιεί τη λίστα domains του Organization (Json πεδίο, άρα αναξιόπιστο). */
export function normalizeDomains(domains: unknown): string[] {
  if (!Array.isArray(domains)) return [];
  return domains
    .filter((d): d is string => typeof d === "string")
    .map((d) =>
      d
        .trim()
        .toLowerCase()
        .replace(/^@/, "")
        .replace(/^https?:\/\//, "")
        .replace(/\/.*$/, "")
    )
    .filter(Boolean);
}

/** Το domain ενός email, πεζά. `null` αν το email είναι άκυρο. */
export function emailDomain(email: string | null | undefined): string | null {
  if (!email) return null;
  const parts = email.trim().toLowerCase().split("@");
  if (parts.length !== 2) return null;
  const [local, domain] = parts;
  if (!local || !domain || !domain.includes(".")) return null;
  return domain;
}

/**
 * Ακριβής αντιστοίχιση domain — τα subdomains ΔΕΝ γίνονται δεκτά.
 * Το `mail.dgsoft.gr` δεν περνά με εγκεκριμένο το `dgsoft.gr`: σε έλεγχο
 * πρόσβασης, το στενότερο είναι το σωστό. Πρόσθεσέ το ρητά αν το χρειάζεσαι.
 *
 * Κενή λίστα domains σημαίνει καμία αυτόματη εγγραφή — όχι ελεύθερη είσοδος.
 */
export function isEmailDomainApproved(email: string | null | undefined, domains: unknown): boolean {
  const approved = normalizeDomains(domains);
  if (approved.length === 0) return false;
  const domain = emailDomain(email);
  return domain !== null && approved.includes(domain);
}
