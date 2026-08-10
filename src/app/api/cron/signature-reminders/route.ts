import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { getBaseUrl } from "@/lib/base-url";
import { resolveRecipient, signatureTestRecipient } from "@/lib/signature/recipient";
import { signatureReminderEmail } from "@/lib/signature/email";
import { documentTitle } from "@/lib/signature/document";

const REMINDER_AFTER_DAYS = 7;
const MAX_REMINDERS = 3;

/**
 * Λήξη + υπενθυμίσεις για αιτήματα υπογραφής.
 *
 * Η δικλείδα `resolveRecipient` ισχύει ΚΑΙ εδώ — ίσως περισσότερο απ' όπου
 * αλλού: μια cron που στέλνει μόνη της, στο δικό της πρόγραμμα, είναι
 * ακριβώς ο τρόπος να φύγει κάτι κατά λάθος αν ξεχαστεί ένα σημείο.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // 1. Λήξη — ανεξάρτητα από την κατάσταση υπενθυμίσεων.
  const expired = await prisma.signatureRequest.updateMany({
    where: { status: { in: ["PENDING", "SENT", "VIEWED"] }, expiresAt: { lt: now } },
    data: { status: "EXPIRED" },
  });

  // 2. Υπενθυμίσεις — μόνο SENT/VIEWED, όχι ήδη ληγμένα, έως 3 φορές, 7+
  // ημέρες από την τελευταία επαφή (υπενθύμιση ή αρχική αποστολή).
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - REMINDER_AFTER_DAYS);

  const due = await prisma.signatureRequest.findMany({
    where: {
      status: { in: ["SENT", "VIEWED"] },
      reminderCount: { lt: MAX_REMINDERS },
      expiresAt: { gt: now },
      OR: [{ lastReminder: null, sentAt: { lte: cutoff } }, { lastReminder: { lte: cutoff } }],
    },
    include: { company: true },
  });

  const base = getBaseUrl(req);
  const org = await prisma.organization.findFirst({ select: { name: true } });

  const results: { id: string; sent: boolean; error?: string }[] = [];

  for (const request of due) {
    if (!request.recipientEmail.trim()) {
      results.push({ id: request.id, sent: false, error: "Λείπει το email του παραλήπτη" });
      continue;
    }
    try {
      const title = await documentTitle(request.entityType, request.entityId);
      const resolved = resolveRecipient(
        { name: request.recipientName, email: request.recipientEmail },
        signatureTestRecipient()
      );
      const attemptNumber = request.reminderCount + 1;

      const { subject, html } = signatureReminderEmail({
        documentTitle: title,
        recipientName: request.recipientName,
        organizationName: org?.name ?? "Ο Οργανισμός μας",
        counterpartyName: request.company?.name ?? request.recipientName,
        notice: resolved.notice,
        signUrl: `${base}/sign/${request.token}`,
        expiresAt: request.expiresAt,
        attemptNumber,
      });

      await sendMail({ to: resolved.to, subject, html });

      await prisma.signatureRequest.update({
        where: { id: request.id },
        data: { reminderCount: attemptNumber, lastReminder: now },
      });

      results.push({ id: request.id, sent: true });
    } catch (e) {
      results.push({ id: request.id, sent: false, error: e instanceof Error ? e.message : "unknown" });
    }
  }

  return NextResponse.json({ expired: expired.count, reminded: results.length, results });
}
