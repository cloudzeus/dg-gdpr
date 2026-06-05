"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { logAction } from "@/lib/action-logger";
import { getClientIp, generateConsentToken } from "@/lib/consent-token";
import { uploadToBunny } from "@/lib/bunny";
import { dataUrlToBuffer } from "@/lib/data-url";
import { sendMail } from "@/lib/mail";
import { consentConfirmedEmail } from "@/lib/consent-email";

interface CaptureInput {
  slug: string;
  values: Record<string, string>;
  purposeConsents: Record<string, boolean>;
  subjectEmail: string;
  subjectPhone?: string;
  signatureDataUrl?: string;
}

export async function captureConsent(input: CaptureInput): Promise<{ recordId: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Μη εξουσιοδοτημένος");

  const email = input.subjectEmail?.trim();
  if (!email) throw new Error("Απαιτείται email πελάτη");

  const project = await prisma.consentProject.findUnique({ where: { slug: input.slug } });
  if (!project || project.status !== "ACTIVE") throw new Error("Το project δεν είναι ενεργό");

  let signatureUrl: string | null = null;
  if (input.signatureDataUrl) {
    const { buffer, contentType } = dataUrlToBuffer(input.signatureDataUrl);
    if (contentType !== "image/png") throw new Error("Η υπογραφή πρέπει να είναι PNG");
    if (buffer.length > 2 * 1024 * 1024) throw new Error("Η υπογραφή είναι πολύ μεγάλη (μέγ. 2MB)");
    signatureUrl = await uploadToBunny(buffer, `signatures/${generateConsentToken()}.png`, "image/png");
  }

  const hdrs = await headers();
  const now = new Date();
  const record = await prisma.consentRecord.create({
    data: {
      projectId: project.id,
      subjectEmail: email,
      subjectPhone: input.subjectPhone?.trim() || null,
      values: input.values as never,
      purposeConsents: input.purposeConsents as never,
      status: "CONFIRMED",
      verifyToken: generateConsentToken(),
      confirmedAt: now,
      ipAddress: getClientIp(hdrs),
      userAgent: hdrs.get("user-agent") ?? null,
      confirmationChannel: "IN_PERSON",
      signatureUrl,
      capturedById: session.user.id,
      locale: "el",
    },
  });

  const mail = consentConfirmedEmail({ projectName: project.name, confirmedAt: now });
  await sendMail({ to: email, subject: mail.subject, html: mail.html });

  await logAction({ action: "CAPTURE", entity: "ConsentRecord", entityId: record.id });
  return { recordId: record.id };
}
