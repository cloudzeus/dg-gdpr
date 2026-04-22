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

export async function listDepartments() {
  return prisma.department.findMany({
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
    include: {
      manager: { select: { id: true, name: true, email: true } },
      _count: { select: { members: true, children: true } },
    },
  });
}

export async function createDepartment(formData: FormData) {
  await requireAdmin();
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Απαιτείται όνομα τμήματος");
  const code = (formData.get("code") as string)?.trim() || null;
  const description = (formData.get("description") as string)?.trim() || null;
  const parentId = (formData.get("parentId") as string) || null;
  const managerId = (formData.get("managerId") as string) || null;

  const dep = await prisma.department.create({
    data: { name, code, description, parentId: parentId || null, managerId: managerId || null },
  });
  await logAction({ action: "CREATE", entity: "Department", entityId: dep.id });
  revalidatePath("/admin/departments");
  return { success: true, id: dep.id };
}

export async function updateDepartment(id: string, formData: FormData) {
  await requireAdmin();
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Απαιτείται όνομα τμήματος");
  const code = (formData.get("code") as string)?.trim() || null;
  const description = (formData.get("description") as string)?.trim() || null;
  const parentId = (formData.get("parentId") as string) || null;
  const managerId = (formData.get("managerId") as string) || null;

  if (parentId === id) throw new Error("Ένα τμήμα δεν μπορεί να είναι γονέας του εαυτού του");

  await prisma.department.update({
    where: { id },
    data: { name, code, description, parentId: parentId || null, managerId: managerId || null },
  });
  await logAction({ action: "UPDATE", entity: "Department", entityId: id });
  revalidatePath("/admin/departments");
  return { success: true };
}

export async function deleteDepartment(id: string) {
  await requireAdmin();
  const children = await prisma.department.count({ where: { parentId: id } });
  if (children > 0) throw new Error("Υπάρχουν υποτμήματα — μετακινήστε ή διαγράψτε πρώτα τα παιδιά");
  const members = await prisma.user.count({ where: { departmentId: id } });
  if (members > 0) throw new Error(`Υπάρχουν ${members} χρήστες στο τμήμα — ανακατανείμετε πρώτα`);

  await prisma.department.delete({ where: { id } });
  await logAction({ action: "DELETE", entity: "Department", entityId: id });
  revalidatePath("/admin/departments");
  return { success: true };
}
