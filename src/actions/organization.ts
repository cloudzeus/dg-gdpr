"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAction } from "@/lib/action-logger";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Μη εξουσιοδοτημένος");
  const role = (session.user as any).role;
  if (role !== "ADMIN") throw new Error("Απαιτείται δικαίωμα Διαχειριστή");
  return session.user.id;
}

export async function getOrganization() {
  return prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
}

type Contact = { label: string; value: string };

export async function updateOrganization(formData: FormData) {
  await requireAdmin();

  const phones = (formData.getAll("phone") as string[]).filter(Boolean).map((number, i) => ({
    label: (formData.getAll("phoneLabel")[i] as string) || "Τηλέφωνο",
    number,
  }));
  const emails = (formData.getAll("email") as string[]).filter(Boolean).map((address, i) => ({
    label: (formData.getAll("emailLabel")[i] as string) || "Email",
    address,
  }));
  const domains = (formData.get("domains") as string)
    ?.split(/[,\s]+/)
    .map((d) => d.trim())
    .filter(Boolean) ?? [];

  const data = {
    name: (formData.get("name") as string) || "Οργανισμός",
    legalName: (formData.get("legalName") as string) || null,
    vatNumber: (formData.get("vatNumber") as string) || null,
    taxOffice: (formData.get("taxOffice") as string) || null,
    registryNo: (formData.get("registryNo") as string) || null,
    logo: (formData.get("logo") as string) || null,
    addressLine1: (formData.get("addressLine1") as string) || null,
    addressLine2: (formData.get("addressLine2") as string) || null,
    city: (formData.get("city") as string) || null,
    postalCode: (formData.get("postalCode") as string) || null,
    country: (formData.get("country") as string) || "Ελλάδα",
    website: (formData.get("website") as string) || null,
    description: (formData.get("description") as string) || null,
    phones: phones as any,
    emails: emails as any,
    domains: domains as any,
  };

  const existing = await prisma.organization.findFirst();
  const saved = existing
    ? await prisma.organization.update({ where: { id: existing.id }, data })
    : await prisma.organization.create({ data });

  await logAction({ action: existing ? "UPDATE" : "CREATE", entity: "Organization", entityId: saved.id });
  revalidatePath("/admin/company");
  return { success: true };
}

export type OrgContact = Contact;
