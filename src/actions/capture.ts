"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { logAction } from "@/lib/action-logger";
import { getClientIp, generateConsentToken } from "@/lib/consent-token";
import { uploadToBunny } from "@/lib/bunny";
import { dataUrlToBuffer } from "@/lib/data-url";
import { sendMail } from "@/lib/mail";
import { consentVerifyEmail } from "@/lib/consent-email";
import { getBaseUrlFromHeaders } from "@/lib/base-url";

interface CaptureInput {
  slug: string;
  values: Record<string, string>;
  purposeConsents: Record<string, boolean>;
  subjectEmail: string;
  subjectPhone?: string;
  signatureDataUrl?: string;
}

export async function captureConsent(input: CaptureInput): Promise<{ recordId: string }> {
  // Works both for a logged-in employee (internal /capture) and a public
  // visitor (/c/<layout>/<slug>). capturedById is set only when an employee
  // captures the consent.
  const session = await auth();
  const capturedById = session?.user?.id ?? null;

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
  // Double opt-in: store the consent + signature as PENDING, then email a
  // verification link. The customer clicks it to set the record CONFIRMED.
  const verifyToken = generateConsentToken();
  const record = await prisma.consentRecord.create({
    data: {
      projectId: project.id,
      subjectEmail: email,
      subjectPhone: input.subjectPhone?.trim() || null,
      values: input.values as never,
      purposeConsents: input.purposeConsents as never,
      status: "PENDING",
      verifyToken,
      ipAddress: getClientIp(hdrs),
      userAgent: hdrs.get("user-agent") ?? null,
      signatureUrl,
      capturedById,
      locale: "el",
    },
  });

  const confirmUrl = `${getBaseUrlFromHeaders(hdrs)}/api/public/consent/confirm/${verifyToken}`;
  const mail = consentVerifyEmail({ projectName: project.name, confirmUrl });
  await sendMail({ to: email, subject: mail.subject, html: mail.html });

  await logAction({ action: "CAPTURE", entity: "ConsentRecord", entityId: record.id });
  return { recordId: record.id };
}
