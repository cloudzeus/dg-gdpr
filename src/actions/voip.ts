"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAction } from "@/lib/action-logger";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createVoIPConfig(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Μη εξουσιοδοτημένος");

  const config = await prisma.voIPConfig.create({
    data: {
      userId: session.user.id,
      providerName: formData.get("providerName") as string,
      sipServer: formData.get("sipServer") as string | undefined,
      recordingEnabled: formData.get("recordingEnabled") === "on",
      legalBasis: (formData.get("legalBasis") as any) || null,
      consentMechanism: formData.get("consentMechanism") as string | undefined,
      retentionDays: parseInt(formData.get("retentionDays") as string) || 90,
      encryptionEnabled: formData.get("encryptionEnabled") === "on",
      notifyCallers: formData.get("notifyCallers") === "on",
      metadataRetainDays: parseInt(formData.get("metadataRetainDays") as string) || 365,
      dpaProviderName: formData.get("dpaProviderName") as string | undefined,
      dpaSignedAt: formData.get("dpaSignedAt") ? new Date(formData.get("dpaSignedAt") as string) : null,
    },
  });

  await logAction({ action: "CREATE", entity: "VoIPConfig", entityId: config.id });
  revalidatePath("/voip");
  redirect("/voip");
}

export async function updateVoIPConfig(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Μη εξουσιοδοτημένος");

  await prisma.voIPConfig.update({
    where: { id },
    data: {
      providerName: formData.get("providerName") as string,
      sipServer: formData.get("sipServer") as string | undefined,
      recordingEnabled: formData.get("recordingEnabled") === "on",
      legalBasis: (formData.get("legalBasis") as any) || null,
      consentMechanism: formData.get("consentMechanism") as string | undefined,
      retentionDays: parseInt(formData.get("retentionDays") as string) || 90,
      encryptionEnabled: formData.get("encryptionEnabled") === "on",
      notifyCallers: formData.get("notifyCallers") === "on",
      metadataRetainDays: parseInt(formData.get("metadataRetainDays") as string) || 365,
    },
  });

  await logAction({ action: "UPDATE", entity: "VoIPConfig", entityId: id });
  revalidatePath("/voip");
}
