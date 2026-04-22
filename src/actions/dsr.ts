"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sendDsrCompleted } from "@/lib/email";
import type { DsrType, DsrStatus } from "@prisma/client";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Μη εξουσιοδοτημένος");
  return session.user;
}

export async function listDsrRequests(filters?: { status?: string; type?: string }) {
  await requireAuth();
  return prisma.dataSubjectRequest.findMany({
    where: {
      ...(filters?.status && filters.status !== "ALL" ? { status: filters.status as DsrStatus } : {}),
      ...(filters?.type && filters.type !== "ALL" ? { type: filters.type as DsrType } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { apiKey: { select: { name: true } } },
  });
}

export async function getDsrRequest(id: string) {
  await requireAuth();
  return prisma.dataSubjectRequest.findUnique({
    where: { id },
    include: { apiKey: { select: { name: true } } },
  });
}

export async function updateDsrStatus(id: string, data: {
  status: string;
  assignedTo?: string;
  responseText?: string;
}) {
  await requireAuth();
  const dsr = await prisma.dataSubjectRequest.findUnique({ where: { id } });
  if (!dsr) throw new Error("Δεν βρέθηκε");

  const updated = await prisma.dataSubjectRequest.update({
    where: { id },
    data: {
      status: data.status as DsrStatus,
      assignedTo: data.assignedTo,
      responseText: data.responseText,
      completedAt: data.status === "COMPLETED" ? new Date() : undefined,
      notifiedAt: data.status === "COMPLETED" ? new Date() : undefined,
    },
  });

  if (data.status === "COMPLETED" && dsr.status !== "COMPLETED") {
    try {
      await sendDsrCompleted({
        to: dsr.subjectEmail,
        subjectName: dsr.subjectName,
        requestId: dsr.id,
        type: dsr.type,
        responseText: data.responseText,
      });
    } catch (e) {
      console.error("[DSR] Failed to send completion email:", e);
    }
  }

  revalidatePath("/admin/dsr");
  return updated;
}

export async function deleteDsrRequest(id: string) {
  const user = await requireAuth();
  if ((user as any).role !== "ADMIN" && (user as any).role !== "DPO") {
    throw new Error("Απαιτούνται δικαιώματα Διαχειριστή ή DPO");
  }
  await prisma.dataSubjectRequest.delete({ where: { id } });
  revalidatePath("/admin/dsr");
}

// ─── API Key management ───────────────────────────────────────────────────────

export async function listApiKeys() {
  const user = await requireAuth();
  if ((user as any).role !== "ADMIN") throw new Error("Απαιτούνται δικαιώματα Διαχειριστή");
  return prisma.apiKey.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { requests: true } } } });
}

export async function createApiKey(data: { name: string; description?: string; allowedOrigins?: string }) {
  const user = await requireAuth();
  if ((user as any).role !== "ADMIN") throw new Error("Απαιτούνται δικαιώματα Διαχειριστή");
  const { generateApiKey } = await import("@/lib/api-key");
  const key = generateApiKey();
  const origins = data.allowedOrigins
    ? data.allowedOrigins.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;
  return prisma.apiKey.create({
    data: { name: data.name, description: data.description, key, allowedOrigins: origins ?? [] },
  });
}

export async function toggleApiKey(id: string, isActive: boolean) {
  const user = await requireAuth();
  if ((user as any).role !== "ADMIN") throw new Error("Απαιτούνται δικαιώματα Διαχειριστή");
  await prisma.apiKey.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/api-keys");
}

export async function deleteApiKey(id: string) {
  const user = await requireAuth();
  if ((user as any).role !== "ADMIN") throw new Error("Απαιτούνται δικαιώματα Διαχειριστή");
  await prisma.apiKey.delete({ where: { id } });
  revalidatePath("/admin/api-keys");
}
