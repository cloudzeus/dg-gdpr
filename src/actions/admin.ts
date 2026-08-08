"use server";

import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/action-logger";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/current-user";


export async function updateUserRole(userId: string, role: string) {
  const adminId = await requireAdmin();
  await prisma.user.update({ where: { id: userId }, data: { role: role as any } });
  await logAction({ action: "UPDATE", entity: "User", entityId: userId, details: { field: "role", value: role } });
  revalidatePath("/admin/roles");
}

export async function updateUserDepartment(userId: string, departmentId: string | null) {
  await requireAdmin();
  await prisma.user.update({ where: { id: userId }, data: { departmentId: departmentId || null } });
  revalidatePath("/admin/roles");
  revalidatePath("/admin/users");
}

export async function updateUserPosition(userId: string, positionId: string | null) {
  await requireAdmin();
  await prisma.user.update({ where: { id: userId }, data: { positionId: positionId || null } });
  revalidatePath("/admin/roles");
  revalidatePath("/admin/users");
}

export async function setUserActive(userId: string, isActive: boolean) {
  await requireAdmin();
  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  await logAction({ action: "UPDATE", entity: "User", entityId: userId, details: { field: "isActive", value: isActive } });
  revalidatePath("/admin/users");
}
