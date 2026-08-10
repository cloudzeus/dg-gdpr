"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";
import { logAction } from "@/lib/action-logger";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProject(formData: FormData) {
  await requireUserId();

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
  const userId = await requireUserId();

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

  const existing = await prisma.devChecklist.findFirst({ where: { projectId, userId: userId } });

  if (existing) {
    await prisma.devChecklist.update({
      where: { id: existing.id },
      data: { ...fields, score, completedAt: score === 100 ? new Date() : null },
    });
    await logAction({ action: "UPDATE", entity: "DevChecklist", entityId: existing.id, projectId });
  } else {
    const checklist = await prisma.devChecklist.create({
      data: { ...fields, score, projectId, userId: userId },
    });
    await logAction({ action: "CREATE", entity: "DevChecklist", entityId: checklist.id, projectId });
  }

  revalidatePath(`/dev/projects/${projectId}`);
}

export async function createDbAccessLog(formData: FormData) {
  const userId = await requireUserId();

  const log = await prisma.dbAccessLog.create({
    data: {
      userId: userId,
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
