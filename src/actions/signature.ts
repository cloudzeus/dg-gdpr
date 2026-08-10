"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";
import { logAction } from "@/lib/action-logger";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getBaseUrlFromHeaders } from "@/lib/base-url";
import { sendMail } from "@/lib/mail";
import { generateConsentToken } from "@/lib/consent-token";
import { resolveRecipient, signatureTestRecipient } from "@/lib/signature/recipient";
import {
  canCompleteProject,
  latestPerDocument,
  type SignatureState,
  type GapState,
  type DocumentSignature,
} from "@/lib/signature/completion";
import { signatureRequestEmail } from "@/lib/signature/email";
import { documentTitle } from "@/lib/signature/document";
import type { SignatureRequest } from "@prisma/client";

const DEFAULT_EXPIRY_DAYS = 30;

function expiryDays(): number {
  const raw = Number(process.env.SIGNATURE_EXPIRY_DAYS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_EXPIRY_DAYS;
}

const OPEN_STATUSES = ["PENDING", "SENT", "VIEWED"] as const;
const TERMINAL_STATUSES = ["SIGNED", "DECLINED", "EXPIRED"] as const;

/**
 * Σαρώνει τα `DpaContract` του έργου που δεν είναι `SIGNED` και δημιουργεί
 * ένα `SignatureRequest` ανά αντισυμβαλλόμενο — ένα ανά έγγραφο, όχι δεύτερο
 * αν υπάρχει ήδη ένα σε εκκρεμότητα (PENDING/SENT/VIEWED) για το ίδιο
 * έγγραφο. Ο παραλήπτης προκύπτει από την εταιρία που συνδέεται με τη
 * σύμβαση (`Company.contactEmail` ή `Company.email`). Αν λείπει διεύθυνση,
 * το αίτημα δημιουργείται σε `PENDING` αλλά δεν στέλνεται — η αποστολή
 * παραμένει ρητή ενέργεια, και το UI ζητά το email πριν επιτρέψει αποστολή.
 */
export async function createSignatureRequests(projectId: string): Promise<number> {
  await requireUserId();

  const contracts = await prisma.dpaContract.findMany({
    where: { projectId, status: { not: "SIGNED" } },
    include: { company: true },
  });
  if (!contracts.length) return 0;

  const pending = await prisma.signatureRequest.findMany({
    where: { projectId, entityType: "DpaContract", status: { in: [...OPEN_STATUSES] } },
    select: { entityId: true },
  });
  const blocked = new Set(pending.map((r) => r.entityId));

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays());

  let created = 0;
  for (const contract of contracts) {
    // Δεύτερο αίτημα σε εκκρεμότητα για το ίδιο έγγραφο, ή έγγραφο που δεν
    // παρήχθη ποτέ (χωρίς pdfUrl) — τίποτα από τα δύο δεν δημιουργεί εγγραφή.
    if (blocked.has(contract.id) || !contract.pdfUrl) continue;

    const recipientName =
      contract.company?.contactName?.trim() || contract.company?.name?.trim() || "Παραλήπτης";
    const recipientEmail =
      contract.company?.contactEmail?.trim() || contract.company?.email?.trim() || "";

    const request = await prisma.signatureRequest.create({
      data: {
        projectId,
        entityType: "DpaContract",
        entityId: contract.id,
        documentUrl: contract.pdfUrl,
        recipientName,
        recipientEmail,
        companyId: contract.companyId,
        token: generateConsentToken(),
        status: "PENDING",
        expiresAt,
      },
    });
    created++;
    await logAction({ action: "CREATE", entity: "SignatureRequest", entityId: request.id, projectId });
  }

  revalidatePath(`/dev/projects/${projectId}`);
  return created;
}

/**
 * Θέτει ή διορθώνει το email παραλήπτη ενός αιτήματος πριν την πρώτη
 * αποστολή — η δικλείδα του UI για τα αιτήματα που δημιουργήθηκαν χωρίς
 * γνωστή διεύθυνση.
 */
export async function updateSignatureRecipientEmail(requestId: string, email: string): Promise<void> {
  await requireUserId();
  const trimmed = email.trim();
  if (!trimmed) throw new Error("Το email δεν μπορεί να είναι κενό");

  const request = await prisma.signatureRequest.update({
    where: { id: requestId },
    data: { recipientEmail: trimmed },
  });

  await logAction({
    action: "UPDATE",
    entity: "SignatureRequest",
    entityId: requestId,
    projectId: request.projectId,
    details: { recipientEmail: trimmed },
  });
  revalidatePath(`/dev/projects/${request.projectId}`);
}

/**
 * Κοινή διαδρομή αποστολής/επαναποστολής — ΠΑΝΤΑ μέσω `resolveRecipient`.
 * Καταγράφει στο `AuditLog` και τον πραγματικό παραλήπτη και πού στάλθηκε
 * τελικά, ώστε μια ανακατεύθυνση δοκιμής να είναι πάντα ελέγξιμη.
 */
async function deliver(
  requestId: string,
  action: "SEND" | "RESEND"
): Promise<{ to: string; redirected: boolean }> {
  const request = await prisma.signatureRequest.findUnique({
    where: { id: requestId },
    include: { company: true },
  });
  if (!request) throw new Error("Το αίτημα υπογραφής δεν βρέθηκε");

  if ((TERMINAL_STATUSES as readonly string[]).includes(request.status)) {
    throw new Error("Το αίτημα δεν στέλνεται πλέον — η κατάστασή του είναι οριστική");
  }
  if (!request.recipientEmail.trim()) {
    throw new Error("Λείπει το email του παραλήπτη — συμπληρώστε το πριν την αποστολή");
  }

  const [org, title] = await Promise.all([
    prisma.organization.findFirst({ select: { name: true } }),
    documentTitle(request.entityType, request.entityId),
  ]);

  const resolved = resolveRecipient(
    { name: request.recipientName, email: request.recipientEmail },
    signatureTestRecipient()
  );

  const base = getBaseUrlFromHeaders(await headers());
  const signUrl = `${base}/sign/${request.token}`;

  const { subject, html } = signatureRequestEmail({
    documentTitle: title,
    recipientName: request.recipientName,
    organizationName: org?.name ?? "Ο Οργανισμός μας",
    counterpartyName: request.company?.name ?? request.recipientName,
    notice: resolved.notice,
    signUrl,
    expiresAt: request.expiresAt,
  });

  await sendMail({ to: resolved.to, subject, html });

  await prisma.signatureRequest.update({
    where: { id: requestId },
    data: {
      status: request.status === "PENDING" ? "SENT" : request.status,
      sentAt: new Date(),
    },
  });

  await logAction({
    action,
    entity: "SignatureRequest",
    entityId: requestId,
    projectId: request.projectId,
    details: {
      realRecipient: request.recipientEmail,
      sentTo: resolved.to,
      redirected: resolved.redirected,
    },
  });

  revalidatePath(`/dev/projects/${request.projectId}`);
  return { to: resolved.to, redirected: resolved.redirected };
}

export async function sendSignatureRequest(requestId: string): Promise<{ to: string; redirected: boolean }> {
  await requireUserId();
  return deliver(requestId, "SEND");
}

export async function resendSignatureRequest(requestId: string): Promise<{ to: string; redirected: boolean }> {
  await requireUserId();
  return deliver(requestId, "RESEND");
}

/**
 * Ακύρωση από το προσωπικό. Δεν υπάρχει ξεχωριστή κατάσταση «ακυρώθηκε» στο
 * schema — μοιράζεται το `DECLINED` με την άρνηση του αντισυμβαλλόμενου, με
 * τον λόγο αποθηκευμένο στο `declineReason`. Το `canCompleteProject` το
 * αντιμετωπίζει το ίδιο και στις δύο περιπτώσεις: δεν κλείνει σιωπηλά.
 */
export async function cancelSignatureRequest(requestId: string, reason: string): Promise<void> {
  await requireUserId();
  const trimmed = reason.trim();
  if (!trimmed) throw new Error("Η ακύρωση απαιτεί αιτιολογία");

  const request = await prisma.signatureRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new Error("Το αίτημα υπογραφής δεν βρέθηκε");
  if (request.status === "SIGNED") throw new Error("Δεν ακυρώνεται αίτημα που έχει ήδη υπογραφεί");

  await prisma.signatureRequest.update({
    where: { id: requestId },
    data: { status: "DECLINED", declinedAt: new Date(), declineReason: trimmed },
  });

  await logAction({
    action: "CANCEL",
    entity: "SignatureRequest",
    entityId: requestId,
    projectId: request.projectId,
    details: { reason: trimmed },
  });
  revalidatePath(`/dev/projects/${request.projectId}`);
}

type CompletionSignatureRow = Pick<
  SignatureRequest,
  "status" | "recipientName" | "declineReason" | "entityType" | "entityId" | "createdAt"
>;

function toSignatureState(r: CompletionSignatureRow): SignatureState & DocumentSignature {
  return {
    status: r.status,
    recipientName: r.recipientName,
    declineReason: r.declineReason,
    entityType: r.entityType,
    entityId: r.entityId,
    createdAt: r.createdAt,
  };
}

/**
 * Κλείνει το έργο μόνο όταν το επιτρέπει το `canCompleteProject` — κάθε
 * υπογραφή `SIGNED` και κάθε κρίσιμο κενό `RESOLVED` (ή `DISMISSED` με
 * αιτιολογία). Αρνείται με τους ίδιους λόγους που θα δει το UI.
 *
 * `latestPerDocument` πρώτα, γιατί το `createSignatureRequests` επιτρέπει
 * νέο αίτημα για ένα έγγραφο μόλις το προηγούμενο λήξει — χωρίς αυτό, ένα
 * παλιό EXPIRED θα μπλόκαρε το έργο ακόμα κι όταν το νέο αίτημα υπογράφηκε.
 */
export async function completeProject(projectId: string): Promise<void> {
  await requireUserId();

  const [signatures, intakes] = await Promise.all([
    prisma.signatureRequest.findMany({
      where: { projectId },
      select: {
        status: true,
        recipientName: true,
        declineReason: true,
        entityType: true,
        entityId: true,
        createdAt: true,
      },
    }),
    prisma.complianceIntake.findMany({
      where: { projectId },
      select: { gaps: { select: { severity: true, status: true, dismissReason: true, title: true } } },
    }),
  ]);

  const signatureStates: SignatureState[] = latestPerDocument(signatures.map(toSignatureState));
  const gapStates: GapState[] = intakes.flatMap((intake) => intake.gaps);

  const verdict = canCompleteProject(signatureStates, gapStates);
  if (!verdict.allowed) {
    throw new Error(verdict.reasons.join(" "));
  }

  await prisma.project.update({ where: { id: projectId }, data: { status: "COMPLETED" } });
  await logAction({ action: "COMPLETE", entity: "Project", entityId: projectId, projectId });
  revalidatePath(`/dev/projects/${projectId}`);
}
