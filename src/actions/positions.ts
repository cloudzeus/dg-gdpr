"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAction } from "@/lib/action-logger";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Μη εξουσιοδοτημένος");
  if ((session.user as any).role !== "ADMIN") throw new Error("Απαιτείται δικαίωμα Διαχειριστή");
}

export async function listPositions() {
  return prisma.position.findMany({
    orderBy: [{ isKeyRole: "desc" }, { title: "asc" }],
    include: { _count: { select: { users: true } } },
  });
}

export async function createPosition(formData: FormData) {
  await requireAdmin();
  const title = (formData.get("title") as string)?.trim();
  if (!title) throw new Error("Απαιτείται τίτλος θέσης");
  const code = (formData.get("code") as string)?.trim() || null;
  const description = (formData.get("description") as string)?.trim() || null;
  const isKeyRole = formData.get("isKeyRole") === "on";

  const pos = await prisma.position.create({
    data: { title, code, description, isKeyRole },
  });
  await logAction({ action: "CREATE", entity: "Position", entityId: pos.id });
  revalidatePath("/admin/positions");
  return { success: true, id: pos.id };
}

export async function updatePosition(id: string, formData: FormData) {
  await requireAdmin();
  const title = (formData.get("title") as string)?.trim();
  if (!title) throw new Error("Απαιτείται τίτλος θέσης");
  const code = (formData.get("code") as string)?.trim() || null;
  const description = (formData.get("description") as string)?.trim() || null;
  const isKeyRole = formData.get("isKeyRole") === "on";

  await prisma.position.update({
    where: { id },
    data: { title, code, description, isKeyRole },
  });
  await logAction({ action: "UPDATE", entity: "Position", entityId: id });
  revalidatePath("/admin/positions");
  return { success: true };
}

export async function deletePosition(id: string) {
  await requireAdmin();
  const count = await prisma.user.count({ where: { positionId: id } });
  if (count > 0) throw new Error(`${count} χρήστες έχουν αυτή τη θέση — αλλάξτε πρώτα`);

  await prisma.position.delete({ where: { id } });
  await logAction({ action: "DELETE", entity: "Position", entityId: id });
  revalidatePath("/admin/positions");
  return { success: true };
}
