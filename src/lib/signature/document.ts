import { prisma } from "@/lib/prisma";

/**
 * Τίτλος εγγράφου για ένα (entityType, entityId) — χρησιμοποιείται στα email
 * και στη δημόσια σελίδα υπογραφής. Πολυμορφικό όπως το ίδιο το
 * `SignatureRequest` (βλ. σχόλιο στο schema), αλλά προς το παρόν μόνο το
 * `DpaContract` περνά από αυτό το κύκλωμα (Task 5 του plan) — οι υπόλοιποι
 * τύποι προστίθενται όταν όντως υπογράφονται, όχι εικαστικά τώρα.
 */
export async function documentTitle(entityType: string, entityId: string): Promise<string> {
  if (entityType === "DpaContract") {
    const contract = await prisma.dpaContract.findUnique({
      where: { id: entityId },
      select: { title: true },
    });
    return contract?.title ?? "Έγγραφο";
  }
  return "Έγγραφο";
}
