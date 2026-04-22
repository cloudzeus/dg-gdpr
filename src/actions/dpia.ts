"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAction } from "@/lib/action-logger";
import { revalidatePath } from "next/cache";

export async function createDpia(formData: FormData): Promise<{ id: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Μη εξουσιοδοτημένος");

  const projectId = formData.get("projectId") as string;
  const title = formData.get("title") as string;
  const processingPurpose = formData.get("processingPurpose") as string;

  if (!projectId || !title || !processingPurpose) {
    throw new Error("Συμπληρώστε όλα τα υποχρεωτικά πεδία");
  }

  const report = await prisma.dpiaReport.create({
    data: {
      userId: session.user.id,
      projectId,
      title,
      processingPurpose,
      necessityAssessed: formData.get("necessityAssessed") === "on",
      dpoConsulted: formData.get("dpoConsulted") === "on",
      dpoName: (formData.get("dpoName") as string) || null,
      risksIdentified: JSON.parse((formData.get("risksIdentified") as string) || "[]"),
      riskMitigation: JSON.parse((formData.get("riskMitigation") as string) || "[]"),
    },
  });

  await logAction({ action: "CREATE", entity: "DpiaReport", entityId: report.id });
  revalidatePath("/dpia");
  return { id: report.id };
}

export async function createDpaContract(formData: FormData): Promise<{ id: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Μη εξουσιοδοτημένος");

  const projectId = formData.get("projectId") as string;
  const title = formData.get("title") as string;

  if (!projectId || !title) throw new Error("Συμπληρώστε όλα τα υποχρεωτικά πεδία");

  const dataCategoriesRaw = formData.get("dataCategories") as string;
  const purposesRaw = formData.get("purposes") as string;

  const dataCategories = dataCategoriesRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const purposes = purposesRaw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const subProcessorsRaw = formData.get("subProcessors") as string;
  const subProcessors = subProcessorsRaw
    ? subProcessorsRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const contract = await prisma.dpaContract.create({
    data: {
      userId: session.user.id,
      projectId,
      title,
      processorName: formData.get("processorName") as string,
      controllerName: formData.get("controllerName") as string,
      dataCategories,
      purposes,
      retentionPeriod: formData.get("retentionPeriod") as string,
      safeguards: (formData.get("safeguards") as string) || null,
      subProcessors,
      gdprArticles: "Άρθρο 28 GDPR",
    },
  });

  await logAction({ action: "CREATE", entity: "DpaContract", entityId: contract.id });
  revalidatePath("/dpia");
  return { id: contract.id };
}
