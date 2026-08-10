"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";
import { logAction } from "@/lib/action-logger";
import { revalidatePath } from "next/cache";

async function requireSuperAdmin() {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });
  if (!user?.isSuperAdmin) throw new Error("Απαιτείται δικαίωμα Υπερδιαχειριστή");
  return userId;
}

/** Any logged-in user may read the license (read-only display). */
export async function getLicense() {
  await requireUserId();
  return prisma.license.findFirst({ orderBy: { createdAt: "asc" } });
}

export async function updateLicense(formData: FormData) {
  await requireSuperAdmin();

  const str = (k: string) => ((formData.get(k) as string) || "").trim() || null;

  const data = {
    serialNumber: str("serialNumber"),
    sellerName: str("sellerName"),
    sellerVat: str("sellerVat"),
    buyerName: str("buyerName"),
    buyerVat: str("buyerVat"),
  };

  const existing = await prisma.license.findFirst();
  const saved = existing
    ? await prisma.license.update({ where: { id: existing.id }, data })
    : await prisma.license.create({ data });

  await logAction({ action: existing ? "UPDATE" : "CREATE", entity: "License", entityId: saved.id });
  revalidatePath("/settings");
  return { success: true };
}
