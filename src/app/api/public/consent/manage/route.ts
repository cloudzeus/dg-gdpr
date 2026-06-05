import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { sendSms } from "@/lib/sms";
import { preferenceAccessEmail } from "@/lib/consent-email";
import { getBaseUrl } from "@/lib/base-url";

// POST { slug, email } → always 200 (no account enumeration). Sends a manage link if a record exists.
export async function POST(req: NextRequest) {
  let body: { slug?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const slug = body.slug?.trim();
  const email = body.email?.trim();
  if (!slug || !email) return NextResponse.json({ error: "slug and email required" }, { status: 400 });

  const project = await prisma.consentProject.findUnique({ where: { slug } });
  if (project) {
    const record = await prisma.consentRecord.findFirst({
      where: { projectId: project.id, subjectEmail: email, status: { in: ["CONFIRMED", "PENDING"] } },
    });
    if (record) {
      const manageUrl = `${getBaseUrl(req)}/c/${project.layoutTemplate}/${slug}/manage/${record.verifyToken}`;
      const mail = preferenceAccessEmail({ projectName: project.name, manageUrl });
      await sendMail({ to: email, subject: mail.subject, html: mail.html });
      if ((project.confirmationMethod === "SMS" || project.confirmationMethod === "BOTH") && record.subjectPhone) {
        await sendSms(record.subjectPhone, `Διαχείριση δεδομένων: ${manageUrl}`);
      }
    }
  }
  return NextResponse.json({ ok: true });
}
