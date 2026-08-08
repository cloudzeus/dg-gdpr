import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Ο συνδεδεμένος χρήστης, όπως είναι ΤΩΡΑ στη βάση.
 *
 * Το JWT ζει 30 ημέρες και κουβαλά ένα στιγμιότυπο του ρόλου από τη στιγμή της
 * σύνδεσης. Αν βασιστούμε σε αυτό για εξουσιοδότηση, τότε ένας χρήστης που
 * υποβιβάστηκε ή απενεργοποιήθηκε κρατά τα παλιά του δικαιώματα μέχρι να λήξει
 * το token. Οι έλεγχοι πρόσβασης διαβάζουν επομένως τη βάση, όχι το session.
 *
 * Η αναζήτηση γίνεται πρώτα με `id` και μετά με `email`, γιατί παλιότερα tokens
 * κρατούν Entra GUID αντί για το `User.id`.
 */
export async function getCurrentUser() {
  const session = await auth();
  const id = session?.user?.id;
  const email = session?.user?.email;

  const select = {
    id: true,
    email: true,
    name: true,
    role: true,
    isActive: true,
    isSuperAdmin: true,
  } as const;

  const byId = id ? await prisma.user.findUnique({ where: { id }, select }) : null;
  if (byId) return byId;

  return email ? prisma.user.findUnique({ where: { email }, select }) : null;
}

/** Ενεργός χρήστης με ρόλο ADMIN — αλλιώς `null`. */
export async function getAdminUser() {
  const user = await getCurrentUser();
  return user?.isActive && user.role === "ADMIN" ? user : null;
}
