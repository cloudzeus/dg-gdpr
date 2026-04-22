"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAction } from "@/lib/action-logger";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProject(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Μη εξουσιοδοτημένος");

  const project = await prisma.project.create({
    data: {
      name: formData.get("name") as string,
      clientName: formData.get("clientName") as string,
      description: formData.get("description") as string | undefined,
      riskLevel: (formData.get("riskLevel") as any) ?? "MEDIUM",
    },
  });

  await logAction({ action: "CREATE", entity: "Project", entityId: project.id });
  revalidatePath("/dev");
  redirect(`/dev/projects/${project.id}`);
}

export async function saveChecklist(projectId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Μη εξουσιοδοτημένος");

  const boolField = (name: string) => formData.get(name) === "on";

  const fields = {
    dataMinimization: boolField("dataMinimization"),
    encryptionAtRest: boolField("encryptionAtRest"),
    encryptionInTransit: boolField("encryptionInTransit"),
    accessControls: boolField("accessControls"),
    inputValidation: boolField("inputValidation"),
    sqlInjectionPrevention: boolField("sqlInjectionPrevention"),
    xssPrevention: boolField("xssPrevention"),
    securityHeaders: boolField("securityHeaders"),
    apiAuthentication: boolField("apiAuthentication"),
    tokenManagement: boolField("tokenManagement"),
    loggingAuditTrail: boolField("loggingAuditTrail"),
    privacyImpactAssessed: boolField("privacyImpactAssessed"),
    retentionPolicyDefined: boolField("retentionPolicyDefined"),
    dpoApproved: boolField("dpoApproved"),
    notes: formData.get("notes") as string | undefined,
  };

  const trueCount = Object.values(fields).filter((v) => v === true).length;
  const score = Math.round((trueCount / 14) * 100);

  const existing = await prisma.devChecklist.findFirst({ where: { projectId, userId: session.user.id } });

  if (existing) {
    await prisma.devChecklist.update({
      where: { id: existing.id },
      data: { ...fields, score, completedAt: score === 100 ? new Date() : null },
    });
    await logAction({ action: "UPDATE", entity: "DevChecklist", entityId: existing.id, projectId });
  } else {
    const checklist = await prisma.devChecklist.create({
      data: { ...fields, score, projectId, userId: session.user.id },
    });
    await logAction({ action: "CREATE", entity: "DevChecklist", entityId: checklist.id, projectId });
  }

  revalidatePath(`/dev/projects/${projectId}`);
}

export async function createDbAccessLog(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Μη εξουσιοδοτημένος");

  const log = await prisma.dbAccessLog.create({
    data: {
      userId: session.user.id,
      projectId: formData.get("projectId") as string,
      developerName: formData.get("developerName") as string,
      clientDb: formData.get("clientDb") as string,
      dbType: (formData.get("dbType") as any) ?? "MYSQL",
      accessReason: formData.get("accessReason") as string,
      accessType: (formData.get("accessType") as any) ?? "READ",
      legalBasis: formData.get("legalBasis") as string | undefined,
      approvedBy: formData.get("approvedBy") as string | undefined,
    },
  });

  await logAction({ action: "CREATE", entity: "DbAccessLog", entityId: log.id });
  revalidatePath("/dev");
  redirect("/dev");
}
