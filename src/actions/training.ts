"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAction } from "@/lib/action-logger";
import { revalidatePath } from "next/cache";
import { sendMail, trainingResultEmail } from "@/lib/mail";

export async function submitTrainingResult(
  moduleId: string,
  answers: Record<string, number>
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Μη εξουσιοδοτημένος");

  const mod = await prisma.trainingModule.findUnique({
    where: { id: moduleId },
    include: { questions: true },
  });
  if (!mod) throw new Error("Ενότητα δεν βρέθηκε");

  let earned = 0;
  let maxPoints = 0;

  for (const q of mod.questions) {
    maxPoints += q.weight;
    if (answers[q.id] === q.correctAnswer) {
      earned += q.weight;
    }
  }

  const score = maxPoints > 0 ? (earned / maxPoints) * 100 : 0;
  const passed = score >= mod.passingScore;

  const retryCount = await prisma.trainingResult.count({
    where: { userId: session.user.id, moduleId },
  });

  const result = await prisma.trainingResult.create({
    data: {
      userId: session.user.id,
      moduleId,
      score,
      passed,
      answers: answers as any,
      retryCount,
    },
  });

  await logAction({ action: "CREATE", entity: "TrainingResult", entityId: result.id });

  // Send result email (fire-and-forget — don't block UX on failure)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true },
  });
  if (user?.email) {
    const mail = trainingResultEmail({
      userName: user.name ?? user.email,
      moduleTitle: mod.title,
      score,
      passed,
      passingScore: mod.passingScore,
      completedAt: result.completedAt,
    });
    try {
      await sendMail({ to: user.email, ...mail });
    } catch (err) {
      console.error("[training] email send failed", err);
    }
  }

  revalidatePath(`/training/${moduleId}`);
  revalidatePath("/training");
  revalidatePath("/my/training");

  return { score: Math.round(score), passed, earned, maxPoints };
}

export async function getMyTrainingResults() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Μη εξουσιοδοτημένος");
  return prisma.trainingResult.findMany({
    where: { userId: session.user.id },
    orderBy: { completedAt: "desc" },
    include: { module: { select: { id: true, title: true, passingScore: true } } },
  });
}
