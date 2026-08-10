import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadToBunny } from "@/lib/bunny";
import { getClientIp } from "@/lib/consent-token";
import { documentTitle } from "@/lib/signature/document";
import { signatureConfirmedEmail } from "@/lib/signature/email";
import { sendMail } from "@/lib/mail";
import { resolveRecipient, signatureTestRecipient } from "@/lib/signature/recipient";
import type { SignatureRequest } from "@prisma/client";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const OPEN_STATUSES = ["PENDING", "SENT", "VIEWED"];
const NOT_ACTIVE = { error: "Ο σύνδεσμος δεν είναι πλέον ενεργός." } as const;

/**
 * Ξαναελέγχει την εγκυρότητα του token ανεξάρτητα από το αν φορτώθηκε η
 * σελίδα — δεν εμπιστεύεται ότι το GET την έδειξε. Ίδιος έλεγχος με τη
 * σελίδα: άγνωστο, ληγμένο, ακυρωμένο ή ήδη υπογεγραμμένο δίνουν το ίδιο
 * ουδέτερο σφάλμα.
 */
async function loadActiveRequest(token: string): Promise<SignatureRequest | null> {
  const request = await prisma.signatureRequest.findUnique({ where: { token } });
  if (!request) return null;
  if (!OPEN_STATUSES.includes(request.status)) return null;
  if (request.expiresAt.getTime() < Date.now()) return null;
  return request;
}

/** Αντίστοιχη οντότητα του κύκλου DPA σε SIGNED — μόνο DpaContract προς το παρόν. */
async function markEntitySigned(
  entityType: string,
  entityId: string,
  signedAt: Date,
  signedDocUrl?: string
): Promise<void> {
  if (entityType === "DpaContract") {
    await prisma.dpaContract.update({
      where: { id: entityId },
      data: { status: "SIGNED", signedAt, ...(signedDocUrl ? { signedDocUrl } : {}) },
    });
  }
}

/**
 * Επιβεβαίωση προς τον υπογράψαντα — ΚΑΙ αυτό το μήνυμα περνά από τη
 * δικλείδα ανακατεύθυνσης, ίδια με κάθε άλλη αποστολή του κυκλώματος.
 * Αποτυχία αποστολής δεν αναιρεί την ήδη καταχωρισμένη υπογραφή.
 */
async function notifySigned(request: SignatureRequest, signedAt: Date): Promise<void> {
  try {
    const [org, company, title] = await Promise.all([
      prisma.organization.findFirst({ select: { name: true } }),
      request.companyId
        ? prisma.company.findUnique({ where: { id: request.companyId }, select: { name: true } })
        : Promise.resolve(null),
      documentTitle(request.entityType, request.entityId),
    ]);

    const resolved = resolveRecipient(
      { name: request.recipientName, email: request.recipientEmail },
      signatureTestRecipient()
    );

    const { subject, html } = signatureConfirmedEmail({
      documentTitle: title,
      recipientName: request.recipientName,
      organizationName: org?.name ?? "Ο Οργανισμός μας",
      counterpartyName: company?.name ?? request.recipientName,
      notice: resolved.notice,
      signedAt,
    });

    await sendMail({ to: resolved.to, subject, html });
  } catch (e) {
    console.error("[sign] confirmation email failed:", e);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const request = await loadActiveRequest(token);
  if (!request) {
    return NextResponse.json(NOT_ACTIVE, { status: 410 });
  }

  const form = await req.formData();
  const mode = form.get("mode");

  const ip = getClientIp(req.headers);
  const userAgent = req.headers.get("user-agent") ?? "unknown";

  if (mode === "electronic") {
    const signerName = (form.get("signerName") as string | null)?.trim();
    const signerTitle = (form.get("signerTitle") as string | null)?.trim();
    const agree = form.get("agree") === "true" || form.get("agree") === "on";
    if (!signerName || !signerTitle || !agree) {
      return NextResponse.json(
        { error: "Συμπληρώστε ονοματεπώνυμο, ιδιότητα και αποδοχή δέσμευσης." },
        { status: 400 }
      );
    }

    const signedAt = new Date();
    await prisma.signatureRequest.update({
      where: { id: request.id },
      data: { status: "SIGNED", signedAt, signerName, signerTitle, signerIp: ip, signerAgent: userAgent },
    });
    await markEntitySigned(request.entityType, request.entityId, signedAt);
    await notifySigned(request, signedAt);

    return NextResponse.json({ ok: true });
  }

  if (mode === "upload") {
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Επιλέξτε αρχείο." }, { status: 400 });
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Μόνο αρχεία PDF γίνονται δεκτά." }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Το αρχείο ξεπερνά τα 20MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadedUrl = await uploadToBunny(
      buffer,
      `signed/signature-requests/${request.id}-${Date.now()}.pdf`,
      "application/pdf"
    );

    const signedAt = new Date();
    await prisma.signatureRequest.update({
      where: { id: request.id },
      data: { status: "SIGNED", signedAt, uploadedUrl, signerIp: ip, signerAgent: userAgent },
    });
    await markEntitySigned(request.entityType, request.entityId, signedAt, uploadedUrl);
    await notifySigned(request, signedAt);

    return NextResponse.json({ ok: true });
  }

  if (mode === "decline") {
    const reason = (form.get("reason") as string | null)?.trim();
    if (!reason) return NextResponse.json({ error: "Χρειάζεται λόγος άρνησης." }, { status: 400 });

    await prisma.signatureRequest.update({
      where: { id: request.id },
      data: { status: "DECLINED", declinedAt: new Date(), declineReason: reason },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Άγνωστη ενέργεια." }, { status: 400 });
}
