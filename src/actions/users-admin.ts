"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAction } from "@/lib/action-logger";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import type { UserRole } from "@prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Μη εξουσιοδοτημένος");
  if ((session.user as any).role !== "ADMIN") throw new Error("Απαιτείται δικαίωμα Διαχειριστή");
  return session.user.id;
}

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      phone: true,
      isActive: true,
      department: { select: { id: true, name: true } },
      position: { select: { id: true, title: true } },
      createdAt: true,
    },
  });
}

export async function createUser(formData: FormData) {
  await requireAdmin();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  if (!email) throw new Error("Απαιτείται email");
  const name = (formData.get("name") as string)?.trim() || null;
  const role = (formData.get("role") as UserRole) || "USER";
  const departmentId = (formData.get("departmentId") as string) || null;
  const positionId = (formData.get("positionId") as string) || null;
  const phone = (formData.get("phone") as string) || null;
  const address = (formData.get("address") as string) || null;
  const passwordPlain = (formData.get("password") as string)?.trim();
  if (!passwordPlain || passwordPlain.length < 8) throw new Error("Ο κωδικός πρέπει να είναι τουλάχιστον 8 χαρακτήρες");
  const password = await bcrypt.hash(passwordPlain, 12);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("Υπάρχει ήδη χρήστης με αυτό το email");

  const user = await prisma.user.create({
    data: { email, name, role, departmentId, positionId, phone, address, password, isActive: true },
  });
  await logAction({ action: "CREATE", entity: "User", entityId: user.id });
  revalidatePath("/admin/users");
  return { success: true, id: user.id };
}

export async function updateUser(id: string, formData: FormData) {
  const adminId = await requireAdmin();
  const name = (formData.get("name") as string)?.trim() || null;
  const role = (formData.get("role") as UserRole) || "USER";
  const departmentId = (formData.get("departmentId") as string) || null;
  const positionId = (formData.get("positionId") as string) || null;
  const phone = (formData.get("phone") as string) || null;
  const address = (formData.get("address") as string) || null;
  const isActive = formData.get("isActive") !== "off";
  const passwordPlain = (formData.get("password") as string)?.trim();

  // Prevent admin demoting themselves
  if (adminId === id && role !== "ADMIN") {
    throw new Error("Δεν μπορείτε να αφαιρέσετε τον ρόλο Διαχειριστή από τον εαυτό σας");
  }

  const data: any = { name, role, departmentId, positionId, phone, address, isActive };
  if (passwordPlain && passwordPlain.length >= 8) {
    data.password = await bcrypt.hash(passwordPlain, 12);
  }
  await prisma.user.update({ where: { id }, data });
  await logAction({ action: "UPDATE", entity: "User", entityId: id });
  revalidatePath("/admin/users");
  return { success: true };
}

export async function deleteUser(id: string) {
  const adminId = await requireAdmin();
  if (adminId === id) throw new Error("Δεν μπορείτε να διαγράψετε τον εαυτό σας");
  await prisma.user.update({ where: { id }, data: { isActive: false } });
  await logAction({ action: "UPDATE", entity: "User", entityId: id, details: { action: "deactivate" } });
  revalidatePath("/admin/users");
  return { success: true };
}
