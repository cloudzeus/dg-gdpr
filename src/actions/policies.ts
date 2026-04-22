"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAction } from "@/lib/action-logger";
import { revalidatePath } from "next/cache";
import type { PolicyType, PolicyStatus } from "@prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Μη εξουσιοδοτημένος");
  if ((session.user as any).role !== "ADMIN") throw new Error("Απαιτείται δικαίωμα Διαχειριστή");
  return session.user.id;
}

export async function listPolicies() {
  return prisma.policyDocument.findMany({
    orderBy: [{ status: "asc" }, { title: "asc" }],
    include: {
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { versions: true } },
    },
  });
}

export async function getPolicy(id: string) {
  return prisma.policyDocument.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      versions: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function getPolicyVersions(policyId: string) {
  await requireAdmin();
  return prisma.policyVersion.findMany({
    where: { policyId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createPolicy(data: {
  title: string;
  type: string;
  version?: string;
  content?: string;
  fileUrl?: string;
  status?: string;
  effectiveDate?: string;
  reviewDate?: string;
  ownerId?: string;
}) {
  const userId = await requireAdmin();
  const { title, type, version = "1.0", content, fileUrl, status = "DRAFT", effectiveDate, reviewDate, ownerId } = data;
  if (!title?.trim()) throw new Error("Απαιτείται τίτλος");

  const doc = await prisma.policyDocument.create({
    data: {
      title: title.trim(),
      type: type as PolicyType,
      version,
      content: content || null,
      fileUrl: fileUrl || null,
      status: status as PolicyStatus,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
      reviewDate: reviewDate ? new Date(reviewDate) : null,
      ownerId: ownerId || null,
    },
  });

  if (content) {
    await prisma.policyVersion.create({
      data: { policyId: doc.id, version, content, changedBy: userId, changeNote: "Αρχική δημιουργία" },
    });
  }

  await logAction({ action: "CREATE", entity: "PolicyDocument", entityId: doc.id });
  revalidatePath("/admin/policies");
  return { success: true, id: doc.id };
}

export async function updatePolicy(
  id: string,
  data: {
    title: string;
    type: string;
    version?: string;
    content?: string;
    fileUrl?: string;
    status?: string;
    effectiveDate?: string;
    reviewDate?: string;
    ownerId?: string;
    changeNote?: string;
  }
) {
  const userId = await requireAdmin();
  const { title, type, version = "1.0", content, fileUrl, status = "DRAFT", effectiveDate, reviewDate, ownerId, changeNote } = data;
  if (!title?.trim()) throw new Error("Απαιτείται τίτλος");

  // Snapshot current version before overwriting
  const current = await prisma.policyDocument.findUnique({ where: { id }, select: { content: true, version: true } });
  if (current?.content) {
    await prisma.policyVersion.create({
      data: {
        policyId: id,
        version: current.version,
        content: current.content,
        changedBy: userId,
        changeNote: changeNote || `Έκδοση ${current.version}`,
      },
    });
  }

  await prisma.policyDocument.update({
    where: { id },
    data: {
      title: title.trim(),
      type: type as PolicyType,
      version,
      content: content || null,
      fileUrl: fileUrl || null,
      status: status as PolicyStatus,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
      reviewDate: reviewDate ? new Date(reviewDate) : null,
      ownerId: ownerId || null,
    },
  });

  await logAction({ action: "UPDATE", entity: "PolicyDocument", entityId: id });
  revalidatePath("/admin/policies");
  revalidatePath(`/admin/policies/${id}`);
  return { success: true };
}

export async function deletePolicy(id: string) {
  await requireAdmin();
  await prisma.policyDocument.delete({ where: { id } });
  await logAction({ action: "DELETE", entity: "PolicyDocument", entityId: id });
  revalidatePath("/admin/policies");
  return { success: true };
}
