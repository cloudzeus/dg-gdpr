"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAction } from "@/lib/action-logger";
import { revalidatePath } from "next/cache";
import { buildDpaWord } from "@/lib/export-dpa-word";
import { uploadToBunny } from "@/lib/bunny";

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

export async function createDpaContract(
  formData: FormData
): Promise<{ id: string; pdfUrl: string | null }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Μη εξουσιοδοτημένος");

  const projectId = formData.get("projectId") as string;
  const title = formData.get("title") as string;
  if (!projectId || !title) throw new Error("Συμπληρώστε όλα τα υποχρεωτικά πεδία");

  const processorName  = formData.get("processorName") as string;
  const processorVat   = (formData.get("processorVat") as string) || null;
  const processorAddress = (formData.get("processorAddress") as string) || null;
  const processorRep   = (formData.get("processorRep") as string) || null;
  const processorEmail = (formData.get("processorEmail") as string) || null;

  const controllerName  = formData.get("controllerName") as string;
  const controllerVat   = (formData.get("controllerVat") as string) || null;
  const controllerAddress = (formData.get("controllerAddress") as string) || null;
  const controllerRep   = (formData.get("controllerRep") as string) || null;
  const controllerEmail = (formData.get("controllerEmail") as string) || null;

  const retentionPeriod = formData.get("retentionPeriod") as string;
  const safeguards      = (formData.get("safeguards") as string) || null;
  const notes           = (formData.get("notes") as string) || null;

  const dataCategories = (formData.get("dataCategories") as string)
    .split(",").map((s) => s.trim()).filter(Boolean);

  const purposes = (formData.get("purposes") as string)
    .split("\n").map((s) => s.trim()).filter(Boolean);

  const subProcessors = (formData.get("subProcessors") as string)
    ? (formData.get("subProcessors") as string).split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const contract = await prisma.dpaContract.create({
    data: {
      userId: session.user.id,
      projectId,
      title,
      processorName, processorVat, processorAddress, processorRep, processorEmail,
      controllerName, controllerVat, controllerAddress, controllerRep, controllerEmail,
      dataCategories,
      purposes,
      retentionPeriod,
      safeguards,
      subProcessors,
      notes,
      gdprArticles: "Άρθρο 28 GDPR",
    },
  });

  // Generate Word and upload to Bunny
  let pdfUrl: string | null = null;
  try {
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } });
    const buf = await buildDpaWord({
      title,
      controllerName,
      controllerAddress: controllerAddress ?? undefined,
      controllerRep: controllerRep ?? undefined,
      controllerEmail: controllerEmail ?? undefined,
      processorName,
      processorAddress: processorAddress ?? undefined,
      processorRep: processorRep ?? undefined,
      processorEmail: processorEmail ?? undefined,
      dataCategories,
      purposes,
      retentionPeriod,
      safeguards: safeguards ?? undefined,
      subProcessors,
      gdprArticles: "Άρθρο 28 GDPR",
      projectName: project?.name,
      controllerVat: controllerVat ?? undefined,
      processorVat: processorVat ?? undefined,
    });

    const vatPart = processorVat?.replace(/\D/g, "") || contract.id.slice(0, 9);
    const ts = Date.now();
    const remotePath = `dpa/${vatPart}_${ts}.docx`;

    pdfUrl = await uploadToBunny(buf, remotePath, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

    await prisma.dpaContract.update({ where: { id: contract.id }, data: { pdfUrl } });
  } catch (e) {
    // Non-fatal — contract saved, just no file URL
    console.error("DPA Word upload failed:", e);
  }

  await logAction({ action: "CREATE", entity: "DpaContract", entityId: contract.id });
  revalidatePath("/dpia");
  return { id: contract.id, pdfUrl };
}

export async function updateDpaContract(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Μη εξουσιοδοτημένος");

  const id      = formData.get("id") as string;
  const status  = formData.get("status") as string;
  const notes   = (formData.get("notes") as string) || null;
  const safeguards = (formData.get("safeguards") as string) || null;
  const processorRep   = (formData.get("processorRep") as string) || null;
  const processorEmail = (formData.get("processorEmail") as string) || null;
  const controllerRep   = (formData.get("controllerRep") as string) || null;
  const controllerEmail = (formData.get("controllerEmail") as string) || null;
  const signedAt = formData.get("signedAt") ? new Date(formData.get("signedAt") as string) : null;
  const expiresAt = formData.get("expiresAt") ? new Date(formData.get("expiresAt") as string) : null;

  await prisma.dpaContract.update({
    where: { id },
    data: { status: status as any, notes, safeguards, processorRep, processorEmail, controllerRep, controllerEmail, signedAt, expiresAt },
  });

  await logAction({ action: "UPDATE", entity: "DpaContract", entityId: id });
  revalidatePath("/dpia");
  revalidatePath(`/dpa/${id}`);
}

export async function regenerateDpaWord(id: string): Promise<{ pdfUrl: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Μη εξουσιοδοτημένος");

  const contract = await prisma.dpaContract.findUnique({
    where: { id },
    include: { project: { select: { name: true } } },
  });
  if (!contract) throw new Error("Δεν βρέθηκε η σύμβαση");

  const buf = await buildDpaWord({
    title: contract.title,
    controllerName: contract.controllerName,
    controllerAddress: contract.controllerAddress ?? undefined,
    controllerRep: contract.controllerRep ?? undefined,
    controllerEmail: contract.controllerEmail ?? undefined,
    processorName: contract.processorName,
    processorAddress: contract.processorAddress ?? undefined,
    processorRep: contract.processorRep ?? undefined,
    processorEmail: contract.processorEmail ?? undefined,
    dataCategories: contract.dataCategories as string[],
    purposes: contract.purposes as string[],
    retentionPeriod: contract.retentionPeriod,
    safeguards: contract.safeguards ?? undefined,
    subProcessors: (contract.subProcessors as string[]) ?? undefined,
    signedAt: contract.signedAt ?? undefined,
    gdprArticles: contract.gdprArticles ?? undefined,
    projectName: contract.project.name,
    controllerVat: contract.controllerVat ?? undefined,
    processorVat: contract.processorVat ?? undefined,
  });

  const vatPart = contract.processorVat?.replace(/\D/g, "") || id.slice(0, 9);
  const ts = Date.now();
  const remotePath = `dpa/${vatPart}_${ts}.docx`;
  const pdfUrl = await uploadToBunny(buf, remotePath, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

  await prisma.dpaContract.update({ where: { id }, data: { pdfUrl } });
  await logAction({ action: "UPDATE", entity: "DpaContract", entityId: id });
  revalidatePath(`/dpa/${id}`);
  return { pdfUrl };
}
