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

export async function listCompanies() {
  return prisma.company.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { _count: { select: { dpaContracts: true } } },
  });
}

function parseRelationships(fd: FormData): string[] {
  return (fd.getAll("relationship") as string[]).filter(Boolean);
}

export async function createCompany(formData: FormData) {
  await requireAdmin();
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Απαιτείται όνομα");
  const data = {
    name,
    legalName: (formData.get("legalName") as string) || null,
    vatNumber: (formData.get("vatNumber") as string) || null,
    taxOffice: (formData.get("taxOffice") as string) || null,
    registryNo: (formData.get("registryNo") as string) || null,
    email: (formData.get("email") as string) || null,
    phone: (formData.get("phone") as string) || null,
    website: (formData.get("website") as string) || null,
    addressLine1: (formData.get("addressLine1") as string) || null,
    addressLine2: (formData.get("addressLine2") as string) || null,
    city: (formData.get("city") as string) || null,
    postalCode: (formData.get("postalCode") as string) || null,
    country: (formData.get("country") as string) || null,
    relationships: parseRelationships(formData) as any,
    contactName: (formData.get("contactName") as string) || null,
    contactEmail: (formData.get("contactEmail") as string) || null,
    contactPhone: (formData.get("contactPhone") as string) || null,
    notes: (formData.get("notes") as string) || null,
    isActive: formData.get("isActive") !== "off",
  };
  const c = await prisma.company.create({ data });
  await logAction({ action: "CREATE", entity: "Company", entityId: c.id });
  revalidatePath("/admin/companies");
  return { success: true, id: c.id };
}

export async function updateCompany(id: string, formData: FormData) {
  await requireAdmin();
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Απαιτείται όνομα");
  await prisma.company.update({
    where: { id },
    data: {
      name,
      legalName: (formData.get("legalName") as string) || null,
      vatNumber: (formData.get("vatNumber") as string) || null,
      taxOffice: (formData.get("taxOffice") as string) || null,
      registryNo: (formData.get("registryNo") as string) || null,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      website: (formData.get("website") as string) || null,
      addressLine1: (formData.get("addressLine1") as string) || null,
      addressLine2: (formData.get("addressLine2") as string) || null,
      city: (formData.get("city") as string) || null,
      postalCode: (formData.get("postalCode") as string) || null,
      country: (formData.get("country") as string) || null,
      relationships: parseRelationships(formData) as any,
      contactName: (formData.get("contactName") as string) || null,
      contactEmail: (formData.get("contactEmail") as string) || null,
      contactPhone: (formData.get("contactPhone") as string) || null,
      notes: (formData.get("notes") as string) || null,
      isActive: formData.get("isActive") !== "off",
    },
  });
  await logAction({ action: "UPDATE", entity: "Company", entityId: id });
  revalidatePath("/admin/companies");
  return { success: true };
}

export async function deleteCompany(id: string) {
  await requireAdmin();
  const dpas = await prisma.dpaContract.count({ where: { companyId: id } });
  if (dpas > 0) throw new Error(`Υπάρχουν ${dpas} DPA συνδεδεμένα — διαγράψτε ή αποσυνδέστε πρώτα`);
  await prisma.company.delete({ where: { id } });
  await logAction({ action: "DELETE", entity: "Company", entityId: id });
  revalidatePath("/admin/companies");
  return { success: true };
}
