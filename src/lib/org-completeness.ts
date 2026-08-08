/**
 * Ελλείψεις στα στοιχεία του οργανισμού.
 *
 * Το ΑΦΜ και τα domains δεν είναι διακοσμητικά: είναι τα κλειδιά με τα οποία
 * η εφαρμογή ξεχωρίζει «εμάς» από τους τρίτους σε συμβάσεις και έγγραφα.
 * Χωρίς αυτά, κάθε αυτόματη αναγνώριση της εταιρίας αποτυγχάνει.
 */

/** Placeholder που γράφει το `updateOrganization` όταν δεν δοθεί επωνυμία. */
export const ORG_NAME_PLACEHOLDER = "Οργανισμός";

export type OrgGapSeverity = "required" | "recommended";

export interface OrgGap {
  key: string;
  label: string;
  severity: OrgGapSeverity;
}

export interface OrgLike {
  name?: string | null;
  legalName?: string | null;
  vatNumber?: string | null;
  taxOffice?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  postalCode?: string | null;
  domains?: unknown;
  emails?: unknown;
}

/** Πόσα μη κενά στοιχεία έχει ένα Json πεδίο που υποτίθεται πως είναι πίνακας. */
function arrayLength(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  return value.filter((v) => {
    if (typeof v === "string") return v.trim().length > 0;
    if (v && typeof v === "object") {
      return Object.values(v).some((x) => typeof x === "string" && x.trim().length > 0);
    }
    return false;
  }).length;
}

function blank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

/**
 * Επιστρέφει τις ελλείψεις με σειρά προτεραιότητας — πρώτα τα `required`.
 * Κενή λίστα σημαίνει πλήρη στοιχεία.
 */
export function findOrgGaps(org: OrgLike | null | undefined): OrgGap[] {
  const gaps: OrgGap[] = [];

  if (!org) {
    return [
      { key: "name", label: "Επωνυμία", severity: "required" },
      { key: "vatNumber", label: "ΑΦΜ", severity: "required" },
      { key: "domains", label: "Domains", severity: "required" },
      { key: "legalName", label: "Νομική επωνυμία", severity: "recommended" },
      { key: "address", label: "Έδρα", severity: "recommended" },
      { key: "taxOffice", label: "ΔΟΥ", severity: "recommended" },
      { key: "emails", label: "Email επικοινωνίας", severity: "recommended" },
    ];
  }

  // Η προεπιλεγμένη τιμή «Οργανισμός» δεν είναι πραγματική επωνυμία.
  if (blank(org.name) || org.name!.trim() === ORG_NAME_PLACEHOLDER) {
    gaps.push({ key: "name", label: "Επωνυμία", severity: "required" });
  }
  if (blank(org.vatNumber)) {
    gaps.push({ key: "vatNumber", label: "ΑΦΜ", severity: "required" });
  }
  if (arrayLength(org.domains) === 0) {
    gaps.push({ key: "domains", label: "Domains", severity: "required" });
  }

  if (blank(org.legalName)) {
    gaps.push({ key: "legalName", label: "Νομική επωνυμία", severity: "recommended" });
  }
  if (blank(org.addressLine1) || blank(org.city) || blank(org.postalCode)) {
    gaps.push({ key: "address", label: "Έδρα", severity: "recommended" });
  }
  if (blank(org.taxOffice)) {
    gaps.push({ key: "taxOffice", label: "ΔΟΥ", severity: "recommended" });
  }
  if (arrayLength(org.emails) === 0) {
    gaps.push({ key: "emails", label: "Email επικοινωνίας", severity: "recommended" });
  }

  return gaps;
}

/** Έχει ο οργανισμός τα ελάχιστα για να αναγνωρίζεται αυτόματα σε έγγραφα; */
export function isOrgIdentifiable(org: OrgLike | null | undefined): boolean {
  return findOrgGaps(org).every((g) => g.severity !== "required");
}
