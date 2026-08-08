/**
 * Κανονικοποίηση και επικύρωση ελληνικού ΑΦΜ.
 *
 * Το ΑΦΜ είναι το κύριο κλειδί με το οποίο αντιστοιχίζουμε τα μέρη μιας
 * σύμβασης σε εγγραφές `Company`. Το OCR το επιστρέφει «βρόμικο», οπότε
 * καθαρίζεται πρώτα· το ψηφίο ελέγχου πιάνει σφάλματα ανάγνωσης πριν
 * αντιστοιχίσουμε λάθος εταιρία.
 */

/** Γράμματα που το OCR συχνά επιστρέφει στη θέση ψηφίων, λατινικά και ελληνικά. */
const LOOKALIKES: Record<string, string> = {
  O: "0", Ο: "0", о: "0",
  I: "1", Ι: "1", l: "1", "|": "1",
  S: "5", Ѕ: "5",
  B: "8",
};

/**
 * Καθαρίζει ένα ΑΦΜ σε 9 ψηφία, ή `null` αν δεν προκύπτει έγκυρο σχήμα.
 * Τα 8ψήφια (προ-1999) συμπληρώνονται με μπροστινό μηδέν.
 */
export function normalizeVat(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // Η ΣΕΙΡΑ ΕΧΕΙ ΣΗΜΑΣΙΑ: το πρόθεμα χώρας φεύγει ΠΡΙΝ την αντικατάσταση
  // ομόγραφων. Αλλιώς το πεζό «l» του «el» γίνεται «1» και το ΑΦΜ βγαίνει
  // 10ψήφιο, άρα απορρίπτεται.
  const stripped = raw.trim().replace(/^(EL|GR)\s*/i, "");
  const digits = [...stripped]
    .map((ch) => LOOKALIKES[ch] ?? ch)
    .join("")
    .replace(/\D/g, "");

  if (digits.length === 8) return `0${digits}`;
  if (digits.length === 9) return digits;
  return null;
}

/**
 * Ψηφίο ελέγχου ελληνικού ΑΦΜ: τα πρώτα 8 ψηφία σταθμίζονται με 2^8…2^1,
 * το άθροισμα mod 11 mod 10 πρέπει να ισούται με το 9ο ψηφίο.
 *
 * Δέχεται ΜΟΝΟ ήδη κανονικοποιημένη είσοδο — κάλεσε πρώτα `normalizeVat`.
 */
export function isValidGreekVat(vat: string | null | undefined): boolean {
  if (!vat || !/^\d{9}$/.test(vat)) return false;
  if (vat === "000000000") return false;

  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += Number(vat[i]) * 2 ** (8 - i);
  }
  return (sum % 11) % 10 === Number(vat[8]);
}
