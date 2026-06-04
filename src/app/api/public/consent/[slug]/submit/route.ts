import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateConsentToken } from "@/lib/consent-token";
import { sendMail } from "@/lib/mail";
import { sendSms } from "@/lib/sms";
import { consentVerifyEmail } from "@/lib/consent-email";

function baseUrl(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
}

// POST { subjectEmail, subjectPhone?, values, purposeConsents, locale? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await prisma.consentProject.findUnique({
    where: { slug },
    include: { purposes: true, fields: { include: { field: true } } },
  });
  if (!project || project.status !== "ACTIVE") {
    return NextResponse.json({ error: "Project not found or inactive" }, { status: 404 });
  }

  let body: { subjectEmail?: string; subjectPhone?: string; values?: Record<string, unknown>; purposeConsents?: Record<string, boolean>; locale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.subjectEmail?.trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Valid subjectEmail required" }, { status: 400 });
  }

  // Whitelist purposeConsents to only valid purpose IDs of this project
  const validPurposeIds = new Set(project.purposes.map((p) => p.id));
  const rawPurposeConsents = body.purposeConsents ?? {};
  const purposeConsents: Record<string, boolean> = {};
  for (const key of Object.keys(rawPurposeConsents)) {
    if (validPurposeIds.has(key)) purposeConsents[key] = Boolean(rawPurposeConsents[key]);
  }

  // Whitelist values to only valid field keys of this project
  const validFieldKeys = new Set(project.fields.map((pf) => pf.field.key));
  const rawValues = body.values ?? {};
  const values: Record<string, unknown> = {};
  for (const key of Object.keys(rawValues)) {
    if (validFieldKeys.has(key)) values[key] = rawValues[key];
  }

  // Required-purpose validation
  for (const p of project.purposes) {
    if (p.required && purposeConsents[p.id] !== true) {
      return NextResponse.json({ error: `Purpose ${p.id} is required` }, { status: 400 });
    }
  }
  // Required-field validation
  for (const pf of project.fields) {
    if (pf.required && !String(values[pf.field.key] ?? "").trim()) {
      return NextResponse.json({ error: `Field ${pf.field.key} is required` }, { status: 400 });
    }
  }

  const verifyToken = generateConsentToken();
  // Preserve legal proof: if an existing CONFIRMED record is found, create a new PENDING record
  // rather than overwriting it. Only update in-place when the record is not yet CONFIRMED.
  const existing = await prisma.consentRecord.findFirst({ where: { projectId: project.id, subjectEmail: email } });
  let record;
  if (existing && existing.status !== "CONFIRMED") {
    record = await prisma.consentRecord.update({
      where: { id: existing.id },
      data: { subjectPhone: body.subjectPhone ?? null, values: values as never, purposeConsents: purposeConsents as never, status: "PENDING", verifyToken, confirmedAt: null, withdrawnAt: null, locale: body.locale ?? "el" },
    });
  } else {
    // No existing record, OR existing record is CONFIRMED (preserve its proof by creating a new one)
    record = await prisma.consentRecord.create({
      data: { projectId: project.id, subjectEmail: email, subjectPhone: body.subjectPhone ?? null, values: values as never, purposeConsents: purposeConsents as never, verifyToken, locale: body.locale ?? "el" },
    });
  }

  const confirmUrl = `${baseUrl(req)}/c/${slug}/confirm/${verifyToken}`;
  const mail = consentVerifyEmail({ projectName: project.name, confirmUrl });
  await sendMail({ to: email, subject: mail.subject, html: mail.html });
  if ((project.confirmationMethod === "SMS" || project.confirmationMethod === "BOTH") && body.subjectPhone) {
    await sendSms(body.subjectPhone, `Επιβεβαιώστε τη συναίνεσή σας: ${confirmUrl}`);
  }

  return NextResponse.json({ ok: true, recordId: record.id }, { status: 201 });
}
