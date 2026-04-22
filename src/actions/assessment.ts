"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAction } from "@/lib/action-logger";
import {
  ASSESSMENT_CATEGORIES,
  calculateCategoryScore,
  type AnswerValue,
} from "@/lib/assessment-questions";
import { revalidatePath } from "next/cache";

export async function saveAssessmentAnswers(
  categoryId: string,
  answers: Record<string, AnswerValue>,
  situations: Record<string, string> = {}
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Μη εξουσιοδοτημένος");

  const category = ASSESSMENT_CATEGORIES.find((c) => c.id === categoryId);
  if (!category) throw new Error("Άγνωστη κατηγορία αξιολόγησης");

  const { percentage } = calculateCategoryScore(category.questions, answers);

  const existing = await prisma.assessment.findFirst({
    where: {
      type: "SECURITY_AUDIT",
      title: categoryId,
    },
  });

  if (existing) {
    await prisma.assessment.update({
      where: { id: existing.id },
      data: {
        answers: answers as any,
        situations: situations as any,
        score: percentage,
        maxScore: 100,
        status: "IN_REVIEW",
        completedAt: new Date(),
      },
    });
    await logAction({ action: "UPDATE", entity: "Assessment", entityId: existing.id });
  } else {
    const dummy = await prisma.project.findFirst();
    if (!dummy) return { success: false, error: "Δεν υπάρχει έργο" };
    const created = await prisma.assessment.create({
      data: {
        projectId: dummy.id,
        type: "SECURITY_AUDIT",
        title: categoryId,
        answers: answers as any,
        situations: situations as any,
        score: percentage,
        maxScore: 100,
        status: "IN_REVIEW",
        completedAt: new Date(),
      },
    });
    await logAction({ action: "CREATE", entity: "Assessment", entityId: created.id });
  }

  revalidatePath("/assessment");
  revalidatePath("/dashboard");
  return { success: true, score: percentage };
}

export async function getAllAssessmentAnswers(): Promise<
  Record<string, { answers: Record<string, AnswerValue>; situations: Record<string, string> }>
> {
  const rows = await prisma.assessment.findMany({
    where: { type: "SECURITY_AUDIT" },
    select: { title: true, answers: true, situations: true },
  });

  const result: Record<string, { answers: Record<string, AnswerValue>; situations: Record<string, string> }> = {};
  for (const row of rows) {
    if (row.title && row.answers) {
      result[row.title] = {
        answers: row.answers as Record<string, AnswerValue>,
        situations: (row.situations as Record<string, string> | null) ?? {},
      };
    }
  }
  return result;
}
