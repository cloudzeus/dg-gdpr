import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/consent-token";
import { sendMail } from "@/lib/mail";
import { consentConfirmedEmail } from "@/lib/consent-email";
import { getBaseUrl } from "@/lib/base-url";

// GET — clicked from the verification email. Redirects to a friendly confirm page.
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const base = getBaseUrl(req);
  const record = await prisma.consentRecord.findUnique({ where: { verifyToken: token }, include: { project: true } });
  if (!record) {
    return NextResponse.redirect(`${base}/c/DEFAULT/unknown/confirm/invalid`);
  }

  if (record.status === "PENDING") {
    const confirmedAt = new Date();
    await prisma.consentRecord.update({
      where: { id: record.id },
      data: {
        status: "CONFIRMED",
        confirmedAt,
        ipAddress: getClientIp(req.headers),
        userAgent: req.headers.get("user-agent") ?? null,
        confirmationChannel: "EMAIL",
      },
    });
    const mail = consentConfirmedEmail({ projectName: record.project.name, confirmedAt });
    await sendMail({ to: record.subjectEmail, subject: mail.subject, html: mail.html });
  }

  return NextResponse.redirect(`${base}/c/${record.project.layoutTemplate}/${record.project.slug}/confirm/${token}`);
}
