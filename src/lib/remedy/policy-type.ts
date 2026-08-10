/**
 * Ποια πολιτική λείπει, από το κείμενο του κενού.
 *
 * Το μοντέλο καλείται να δηλώσει το `policyType` και συχνά το παραλείπει —
 * είναι ένα πεδίο μέσα σε μια μακριά δομή JSON. Αλλά αυτό δεν είναι κρίση που
 * χρειάζεται μοντέλο: είναι αντιστοίχιση δεκαεννιά γνωστών τιμών σε ελληνικές
 * λέξεις-κλειδιά, και μια αντιστοίχιση που μπορούμε να κάνουμε ακριβώς δεν
 * πρέπει να ανατίθεται σε κάτι πιθανοτικό.
 *
 * Χρησιμοποιείται ΜΟΝΟ ως εφεδρεία: αν το μοντέλο δώσει τιμή, αυτή υπερισχύει.
 */

export type PolicyTypeValue =
  | "SECURITY_POLICY" | "ACCEPTABLE_USE" | "DATA_RETENTION" | "INCIDENT_RESPONSE"
  | "BYOD" | "PASSWORD_POLICY" | "BACKUP" | "ACCESS_CONTROL" | "PRIVACY_NOTICE"
  | "COOKIE_POLICY" | "DATA_BREACH" | "EMPLOYEE_HANDBOOK" | "ETHICS_CODE"
  | "CLEAR_DESK" | "REMOTE_WORK" | "VENDOR_MANAGEMENT" | "CHANGE_MANAGEMENT"
  | "BUSINESS_CONTINUITY" | "OTHER";

/**
 * Οι εκφράσεις χρησιμοποιούν `\p{L}` με σημαία `u`, όχι `\w`: το `\w` της
 * JavaScript είναι `[A-Za-z0-9_]` και δεν πιάνει ούτε ένα ελληνικό γράμμα.
 *
 * Σειρά προτεραιότητας: οι πιο ειδικές πρώτα. Η «παραβίαση δεδομένων» πρέπει να
 * νικά την «ασφάλεια», αλλιώς κάθε αναφορά σε ασφάλεια θα τραβούσε το γενικό.
 */
const PATTERNS: [PolicyTypeValue, RegExp][] = [
  ["DATA_BREACH",         /παραβιασ\p{L}*\s+δεδομ|περιστατικ\p{L}*\s+παραβιασ|γνωστοποιησ\p{L}*\s+παραβιασ/iu],
  ["INCIDENT_RESPONSE",   /αντιμετωπισ\p{L}*\s+περιστατικ|αποκρισ\p{L}*\s+σε\s+περιστατικ/iu],
  ["ACCESS_CONTROL",      /ελεγχ\p{L}*\s+προσβασ|ελεγχο\s+προσβασ|δικαιωματων\s+προσβασ/iu],
  ["PASSWORD_POLICY",     /κωδικ\p{L}*\s+προσβασ|συνθηματικ/iu],
  ["DATA_RETENTION",      /διατηρησ\p{L}*\s+δεδομ|χρον\p{L}*\s+διατηρησ/iu],
  ["BACKUP",              /αντιγραφ\p{L}*\s+ασφαλειας|backup|εφεδρικ/iu],
  ["VENDOR_MANAGEMENT",   /προμηθευτ|υπεργολαβ|τριτ\p{L}*\s+μερ|vendor/iu],
  ["BUSINESS_CONTINUITY", /επιχειρησιακ\p{L}*\s+συνεχει|ανακαμψ\p{L}*\s+απο\s+καταστροφ/iu],
  ["CHANGE_MANAGEMENT",   /διαχειρισ\p{L}*\s+αλλαγ/iu],
  ["PRIVACY_NOTICE",      /ενημερωσ\p{L}*\s+υποκειμεν|δηλωσ\p{L}*\s+απορρητου|privacy notice/iu],
  ["COOKIE_POLICY",       /cookie|μπισκοτ/iu],
  ["REMOTE_WORK",         /τηλεργασ|απομακρυσμεν\p{L}*\s+εργασ/iu],
  ["BYOD",                /byod|προσωπικ\p{L}*\s+συσκευ/iu],
  ["CLEAR_DESK",          /καθαρ\p{L}*\s+γραφει|clear desk/iu],
  ["ACCEPTABLE_USE",      /αποδεκτ\p{L}*\s+χρησ/iu],
  ["ETHICS_CODE",         /δεοντολογ|ηθικ/iu],
  ["EMPLOYEE_HANDBOOK",   /εγχειριδι\p{L}*\s+εργαζομεν/iu],
  ["SECURITY_POLICY",     /ασφαλει/iu],
];

/** `null` όταν δεν προκύπτει με βεβαιότητα — καλύτερα να ρωτηθεί ο άνθρωπος. */
export function inferPolicyType(text: string | null | undefined): PolicyTypeValue | null {
  if (!text?.trim()) return null;
  // Οι τόνοι μετακινούνται στις πτώσεις — «παραβίαση» αλλά «παραβιάσεων».
  // Τους αφαιρούμε και από τα δύο, ώστε να μη γράφουμε κάθε κλιτικό τύπο.
  const plain = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [type, pattern] of PATTERNS) {
    if (pattern.test(plain)) return type;
  }
  return null;
}
