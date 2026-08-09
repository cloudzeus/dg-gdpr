/**
 * Μεταφράζει το ζεύγος ρόλων σε `DpaRole`, το enum που ήδη χρησιμοποιεί το
 * υπάρχον DPA module. Το `PartyRole` περιγράφει ΕΝΑ μέρος (γιατί οι συμβάσεις
 * έχουν συχνά τρία ή τέσσερα)· το `DpaRole` περιγράφει τη σχέση ενός ζεύγους.
 */

export type PartyRoleValue =
  | "CONTROLLER" | "PROCESSOR" | "JOINT_CONTROLLER"
  | "SUB_PROCESSOR" | "RECIPIENT" | "THIRD_PARTY";

export type DpaRoleValue =
  | "COMPANY_AS_PROCESSOR" | "COMPANY_AS_CONTROLLER" | "JOINT_CONTROLLERS";

/**
 * `null` για κάθε συνδυασμό που δεν αντιστοιχεί σε DPA άρθρου 28 — π.χ. δύο
 * Υπεύθυνοι Επεξεργασίας χωρίς από κοινού καθορισμό σκοπών δεν συνάπτουν DPA.
 * Ο καλών πρέπει να χειριστεί το `null`, όχι να υποθέσει προεπιλογή.
 */
export function toDpaRole(
  ours: PartyRoleValue | null | undefined,
  theirs: PartyRoleValue | null | undefined
): DpaRoleValue | null {
  if (!ours || !theirs) return null;

  if (ours === "CONTROLLER" && theirs === "PROCESSOR") return "COMPANY_AS_PROCESSOR";
  if (ours === "PROCESSOR" && theirs === "CONTROLLER") return "COMPANY_AS_CONTROLLER";
  if (ours === "JOINT_CONTROLLER" && theirs === "JOINT_CONTROLLER") return "JOINT_CONTROLLERS";

  return null;
}
