"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAction } from "@/lib/action-logger";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Μη εξουσιοδοτημένος");

  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const address = formData.get("address") as string;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: name || undefined,
      phone: phone || null,
      address: address || null,
    },
  });

  await logAction({ action: "UPDATE", entity: "User", entityId: session.user.id });
  revalidatePath("/settings");
}

export async function uploadAvatar(formData: FormData): Promise<{ image: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Μη εξουσιοδοτημένος");

  const file = formData.get("avatar") as File;
  if (!file || file.size === 0) throw new Error("Δεν επιλέχθηκε αρχείο");
  if (file.size > 2 * 1024 * 1024) throw new Error("Μέγιστο μέγεθος 2MB");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Επιτρεπτοί τύποι: JPG, PNG, WEBP");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const filename = `${session.user.id}.${ext}`;

  const uploadDir = path.join(process.cwd(), "public", "avatars");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);

  const imageUrl = `/avatars/${filename}`;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: imageUrl },
  });

  await logAction({ action: "UPDATE", entity: "User", entityId: session.user.id });
  revalidatePath("/settings");
  revalidatePath("/dashboard");

  return { image: imageUrl };
}
