"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAction } from "@/lib/action-logger";
import { revalidatePath } from "next/cache";

export async function createErasureRequest(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Μη εξουσιοδοτημένος");

  const systems = (formData.get("systems") as string)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const req = await prisma.erasureRequest.create({
    data: {
      subjectName: formData.get("subjectName") as string,
      subjectEmail: formData.get("subjectEmail") as string,
      subjectPhone: (formData.get("subjectPhone") as string) || undefined,
      description: formData.get("description") as string,
      systems,
      assignedTo: (formData.get("assignedTo") as string) || undefined,
    },
  });

  await logAction({ action: "CREATE", entity: "ErasureRequest", entityId: req.id });
  revalidatePath("/erasure");
}

export async function updateErasureStatus(id: string, status: string, notes?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Μη εξουσιοδοτημένος");

  await prisma.erasureRequest.update({
    where: { id },
    data: {
      status: status as any,
      notes,
      completedAt: status === "COMPLETED" ? new Date() : undefined,
      verifiedAt: status === "COMPLETED" ? new Date() : undefined,
    },
  });

  await logAction({ action: "UPDATE", entity: "ErasureRequest", entityId: id });
  revalidatePath("/erasure");
}
