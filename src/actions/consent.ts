"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAction } from "@/lib/action-logger";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/slug";
import { generateConsentToken } from "@/lib/consent-token";
import type { LocalizedText } from "@/lib/localized";
import type {
  DataFieldCategory,
  FieldInputType,
  ConsentProjectStatus,
  ConfirmationMethod,
  LegalBasis,
} from "@prisma/client";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

// ── Personal Data Fields ───────────────────────────────────────────────

export async function listPersonalDataFields() {
  await requireUser();
  return prisma.personalDataField.findMany({ orderBy: { key: "asc" } });
}

export async function createPersonalDataField(input: {
  key: string;
  label: LocalizedText;
  description: LocalizedText;
  category: DataFieldCategory;
  isSpecialCategory: boolean;
  inputType: FieldInputType;
}) {
  await requireUser();
  const key = slugify(input.key);
  const created = await prisma.personalDataField.create({
    data: { ...input, key, label: input.label as never, description: input.description as never },
  });
  await logAction({ action: "CREATE", entity: "PersonalDataField", entityId: created.id });
  revalidatePath("/consent/fields");
  return created;
}

export async function updatePersonalDataField(
  id: string,
  input: Partial<{
    label: LocalizedText;
    description: LocalizedText;
    category: DataFieldCategory;
    isSpecialCategory: boolean;
    inputType: FieldInputType;
    suggestedLegalBasis: unknown;
  }>,
) {
  await requireUser();
  const updated = await prisma.personalDataField.update({ where: { id }, data: input as never });
  await logAction({ action: "UPDATE", entity: "PersonalDataField", entityId: id });
  revalidatePath("/consent/fields");
  return updated;
}

export async function deletePersonalDataField(id: string) {
  await requireUser();
  await prisma.personalDataField.delete({ where: { id } });
  await logAction({ action: "DELETE", entity: "PersonalDataField", entityId: id });
  revalidatePath("/consent/fields");
}

// ── Consent Projects ───────────────────────────────────────────────────

export async function listConsentProjects() {
  await requireUser();
  return prisma.consentProject.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { records: true, fields: true, purposes: true } } },
  });
}

export async function getConsentProjectById(id: string) {
  await requireUser();
  return prisma.consentProject.findUnique({
    where: { id },
    include: {
      fields: { include: { field: true }, orderBy: { order: "asc" } },
      purposes: { orderBy: { order: "asc" } },
    },
  });
}

export async function createConsentProject(input: {
  name: string;
  description: LocalizedText;
  confirmationMethod: ConfirmationMethod;
}) {
  await requireUser();
  let base = slugify(input.name) || "project";
  let slug = base;
  let i = 1;
  while (await prisma.consentProject.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  const created = await prisma.consentProject.create({
    data: { name: input.name, description: input.description as never, confirmationMethod: input.confirmationMethod, slug },
  });
  await logAction({ action: "CREATE", entity: "ConsentProject", entityId: created.id });
  revalidatePath("/consent/projects");
  return created;
}

export async function updateConsentProject(
  id: string,
  input: Partial<{
    name: string;
    description: LocalizedText;
    status: ConsentProjectStatus;
    confirmationMethod: ConfirmationMethod;
  }>,
) {
  await requireUser();
  const updated = await prisma.consentProject.update({ where: { id }, data: input as never });
  await logAction({ action: "UPDATE", entity: "ConsentProject", entityId: id });
  revalidatePath("/consent/projects");
  revalidatePath(`/consent/projects/${id}`);
  return updated;
}

export async function deleteConsentProject(id: string) {
  await requireUser();
  await prisma.consentProject.delete({ where: { id } });
  await logAction({ action: "DELETE", entity: "ConsentProject", entityId: id });
  revalidatePath("/consent/projects");
}

export async function setProjectFields(
  projectId: string,
  fields: Array<{ fieldId: string; required: boolean }>,
) {
  await requireUser();
  await prisma.consentProjectField.deleteMany({ where: { projectId } });
  if (fields.length) {
    await prisma.consentProjectField.createMany({
      data: fields.map((f, idx) => ({ projectId, fieldId: f.fieldId, required: f.required, order: idx })),
    });
  }
  await logAction({ action: "UPDATE", entity: "ConsentProjectFields", entityId: projectId });
  revalidatePath(`/consent/projects/${projectId}`);
}

// ── Purposes ───────────────────────────────────────────────────────────

export async function addPurpose(projectId: string, input: {
  label: LocalizedText;
  description: LocalizedText;
  legalBasis: LegalBasis;
  required: boolean;
}) {
  await requireUser();
  const count = await prisma.consentPurpose.count({ where: { projectId } });
  const created = await prisma.consentPurpose.create({
    data: { projectId, ...input, order: count, label: input.label as never, description: input.description as never },
  });
  revalidatePath(`/consent/projects/${projectId}`);
  return created;
}

export async function updatePurpose(id: string, input: Partial<{
  label: LocalizedText;
  description: LocalizedText;
  legalBasis: LegalBasis;
  required: boolean;
}>) {
  await requireUser();
  const updated = await prisma.consentPurpose.update({ where: { id }, data: input as never });
  revalidatePath(`/consent/projects/${updated.projectId}`);
  return updated;
}

export async function deletePurpose(id: string) {
  await requireUser();
  const purpose = await prisma.consentPurpose.delete({ where: { id } });
  revalidatePath(`/consent/projects/${purpose.projectId}`);
}

// ── Records ────────────────────────────────────────────────────────────

export async function listConsentRecords(projectId: string, status?: "PENDING" | "CONFIRMED" | "WITHDRAWN") {
  await requireUser();
  return prisma.consentRecord.findMany({
    where: { projectId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
  });
}

export async function adminWithdrawConsent(id: string) {
  await requireUser();
  const updated = await prisma.consentRecord.update({
    where: { id },
    data: { status: "WITHDRAWN", withdrawnAt: new Date() },
  });
  await logAction({ action: "WITHDRAW", entity: "ConsentRecord", entityId: id });
  revalidatePath(`/consent/projects/${updated.projectId}/records`);
  return updated;
}

// Re-export for the public submit route (token generated server-side)
export { generateConsentToken };
