"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAction } from "@/lib/action-logger";
import { revalidatePath } from "next/cache";
import type { MaterialType, UserRole } from "@prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Μη εξουσιοδοτημένος");
  if ((session.user as any).role !== "ADMIN") throw new Error("Απαιτείται δικαίωμα Διαχειριστή");
}

export async function listTrainingModules() {
  return prisma.trainingModule.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { sections: true, questions: true, results: true } },
    },
  });
}

export async function getTrainingModule(id: string) {
  return prisma.trainingModule.findUnique({
    where: { id },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: { materials: { orderBy: { order: "asc" } } },
      },
      questions: { orderBy: { order: "asc" } },
    },
  });
}

// ── Module CRUD ────────────────────────────────────────────────────────────

export async function createModule(formData: FormData) {
  await requireAdmin();
  const title = (formData.get("title") as string)?.trim();
  if (!title) throw new Error("Απαιτείται τίτλος");
  const description = (formData.get("description") as string) || null;
  const passingScore = parseInt((formData.get("passingScore") as string) || "70");
  const durationMin = parseInt((formData.get("durationMin") as string) || "30");
  const targetRoleRaw = formData.get("targetRole") as string;
  const targetRole = targetRoleRaw ? (targetRoleRaw as UserRole) : null;

  const m = await prisma.trainingModule.create({
    data: { title, description, passingScore, durationMin, targetRole },
  });
  await logAction({ action: "CREATE", entity: "TrainingModule", entityId: m.id });
  revalidatePath("/admin/training");
  return { success: true, id: m.id };
}

export async function updateModule(id: string, formData: FormData) {
  await requireAdmin();
  const title = (formData.get("title") as string)?.trim();
  if (!title) throw new Error("Απαιτείται τίτλος");
  const targetRoleRaw = formData.get("targetRole") as string;

  await prisma.trainingModule.update({
    where: { id },
    data: {
      title,
      description: (formData.get("description") as string) || null,
      passingScore: parseInt((formData.get("passingScore") as string) || "70"),
      durationMin: parseInt((formData.get("durationMin") as string) || "30"),
      targetRole: targetRoleRaw ? (targetRoleRaw as UserRole) : null,
      isActive: formData.get("isActive") !== "off",
    },
  });
  await logAction({ action: "UPDATE", entity: "TrainingModule", entityId: id });
  revalidatePath("/admin/training");
  revalidatePath(`/admin/training/${id}`);
  return { success: true };
}

export async function deleteModule(id: string) {
  await requireAdmin();
  await prisma.trainingQuestion.deleteMany({ where: { moduleId: id } });
  const sections = await prisma.trainingSection.findMany({ where: { moduleId: id }, select: { id: true } });
  await prisma.trainingMaterial.deleteMany({ where: { sectionId: { in: sections.map((s) => s.id) } } });
  await prisma.trainingSection.deleteMany({ where: { moduleId: id } });
  await prisma.trainingModule.delete({ where: { id } });
  await logAction({ action: "DELETE", entity: "TrainingModule", entityId: id });
  revalidatePath("/admin/training");
  return { success: true };
}

// ── Section CRUD ───────────────────────────────────────────────────────────

export async function createSection(moduleId: string, formData: FormData) {
  await requireAdmin();
  const title = (formData.get("title") as string)?.trim();
  if (!title) throw new Error("Απαιτείται τίτλος ενότητας");
  const body = (formData.get("body") as string) || null;
  const orderMax = await prisma.trainingSection.aggregate({
    where: { moduleId },
    _max: { order: true },
  });
  const sec = await prisma.trainingSection.create({
    data: { moduleId, title, body, order: (orderMax._max.order ?? 0) + 1 },
  });
  await logAction({ action: "CREATE", entity: "TrainingSection", entityId: sec.id });
  revalidatePath(`/admin/training/${moduleId}`);
  return { success: true, id: sec.id };
}

export async function updateSection(id: string, formData: FormData) {
  await requireAdmin();
  const title = (formData.get("title") as string)?.trim();
  if (!title) throw new Error("Απαιτείται τίτλος ενότητας");
  const updated = await prisma.trainingSection.update({
    where: { id },
    data: { title, body: (formData.get("body") as string) || null },
  });
  await logAction({ action: "UPDATE", entity: "TrainingSection", entityId: id });
  revalidatePath(`/admin/training/${updated.moduleId}`);
  return { success: true };
}

export async function deleteSection(id: string) {
  await requireAdmin();
  const sec = await prisma.trainingSection.findUnique({ where: { id } });
  if (!sec) return { success: true };
  await prisma.trainingMaterial.deleteMany({ where: { sectionId: id } });
  await prisma.trainingSection.delete({ where: { id } });
  await logAction({ action: "DELETE", entity: "TrainingSection", entityId: id });
  revalidatePath(`/admin/training/${sec.moduleId}`);
  return { success: true };
}

// ── Material CRUD ──────────────────────────────────────────────────────────

export async function createMaterial(sectionId: string, formData: FormData) {
  await requireAdmin();
  const title = (formData.get("title") as string)?.trim();
  if (!title) throw new Error("Απαιτείται τίτλος υλικού");
  const type = formData.get("type") as MaterialType;
  const url = (formData.get("url") as string) || null;
  const content = (formData.get("content") as string) || null;
  const mimeType = (formData.get("mimeType") as string) || null;
  const orderMax = await prisma.trainingMaterial.aggregate({
    where: { sectionId },
    _max: { order: true },
  });
  const mat = await prisma.trainingMaterial.create({
    data: { sectionId, title, type, url, content, mimeType, order: (orderMax._max.order ?? 0) + 1 },
  });
  await logAction({ action: "CREATE", entity: "TrainingMaterial", entityId: mat.id });
  const sec = await prisma.trainingSection.findUnique({ where: { id: sectionId } });
  if (sec) revalidatePath(`/admin/training/${sec.moduleId}`);
  return { success: true };
}

export async function deleteMaterial(id: string) {
  await requireAdmin();
  const mat = await prisma.trainingMaterial.findUnique({
    where: { id },
    include: { section: true },
  });
  if (!mat) return { success: true };
  await prisma.trainingMaterial.delete({ where: { id } });
  await logAction({ action: "DELETE", entity: "TrainingMaterial", entityId: id });
  revalidatePath(`/admin/training/${mat.section.moduleId}`);
  return { success: true };
}

// ── Question CRUD ──────────────────────────────────────────────────────────

export async function createQuestion(moduleId: string, formData: FormData) {
  await requireAdmin();
  const question = (formData.get("question") as string)?.trim();
  if (!question) throw new Error("Απαιτείται ερώτηση");
  const options = (formData.getAll("option") as string[]).filter((s) => s.trim());
  if (options.length < 2) throw new Error("Απαιτούνται τουλάχιστον 2 επιλογές");
  const correctAnswer = parseInt((formData.get("correctAnswer") as string) || "0");
  if (correctAnswer < 0 || correctAnswer >= options.length) throw new Error("Μη έγκυρη σωστή απάντηση");
  const explanation = (formData.get("explanation") as string) || null;
  const weight = parseInt((formData.get("weight") as string) || "1");

  const orderMax = await prisma.trainingQuestion.aggregate({
    where: { moduleId },
    _max: { order: true },
  });
  const q = await prisma.trainingQuestion.create({
    data: {
      moduleId,
      question,
      options: JSON.stringify(options) as any,
      correctAnswer,
      explanation,
      weight,
      order: (orderMax._max.order ?? 0) + 1,
    },
  });
  await logAction({ action: "CREATE", entity: "TrainingQuestion", entityId: q.id });
  revalidatePath(`/admin/training/${moduleId}`);
  return { success: true };
}

export async function updateQuestion(id: string, formData: FormData) {
  await requireAdmin();
  const question = (formData.get("question") as string)?.trim();
  if (!question) throw new Error("Απαιτείται ερώτηση");
  const options = (formData.getAll("option") as string[]).filter((s) => s.trim());
  if (options.length < 2) throw new Error("Απαιτούνται τουλάχιστον 2 επιλογές");
  const correctAnswer = parseInt((formData.get("correctAnswer") as string) || "0");
  const explanation = (formData.get("explanation") as string) || null;
  const weight = parseInt((formData.get("weight") as string) || "1");

  const updated = await prisma.trainingQuestion.update({
    where: { id },
    data: {
      question,
      options: JSON.stringify(options) as any,
      correctAnswer,
      explanation,
      weight,
    },
  });
  await logAction({ action: "UPDATE", entity: "TrainingQuestion", entityId: id });
  revalidatePath(`/admin/training/${updated.moduleId}`);
  return { success: true };
}

export async function deleteQuestion(id: string) {
  await requireAdmin();
  const q = await prisma.trainingQuestion.findUnique({ where: { id } });
  if (!q) return { success: true };
  await prisma.trainingQuestion.delete({ where: { id } });
  await logAction({ action: "DELETE", entity: "TrainingQuestion", entityId: id });
  revalidatePath(`/admin/training/${q.moduleId}`);
  return { success: true };
}

// ── Training history & email ────────────────────────────────────────────────

export async function listTrainingHistory(userId?: string) {
  await requireAdmin();
  return prisma.trainingResult.findMany({
    where: userId ? { userId } : undefined,
    orderBy: { completedAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      module: { select: { id: true, title: true, passingScore: true } },
    },
  });
}
