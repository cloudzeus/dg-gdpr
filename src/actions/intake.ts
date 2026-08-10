// src/actions/intake.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";
import { logAction } from "@/lib/action-logger";
import { uploadToBunny } from "@/lib/bunny";
import { revalidatePath } from "next/cache";
import { createHash } from "crypto";
import { buildComplianceProfile, getOwnGroupCandidates } from "@/lib/intake/compliance-profile";
import { matchParty } from "@/lib/intake/company-match";
import { canCommit, type GapState, type PartyState } from "@/lib/intake/blocking-rule";
import { toDpaRole, type PartyRoleValue } from "@/lib/intake/role-mapping";
import type { Extraction, Reasoning } from "@/lib/intake/schemas";

const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_BYTES = 20 * 1024 * 1024;
const MAX_FILES = 20;

export async function createIntake(title: string) {
  const userId = await requireUserId();
  const clean = title.trim();
  if (!clean) throw new Error("Ο τίτλος είναι υποχρεωτικός");

  // Το προφίλ αποθηκεύεται ΤΩΡΑ ως τεκμήριο: πρέπει να φαίνεται με τι δεδομένα
  // ελήφθη η απόφαση, ακόμη κι αν η συμμόρφωση αλλάξει αύριο.
  const profile = await buildComplianceProfile();

  const intake = await prisma.complianceIntake.create({
    data: { userId, title: clean, profileSnapshot: profile as never },
  });

  await logAction({ action: "CREATE", entity: "ComplianceIntake", entityId: intake.id });
  revalidatePath("/intake");
  return intake.id;
}

export async function addIntakeDocument(intakeId: string, formData: FormData) {
  await requireUserId();

  const file = formData.get("file") as File | null;
  const kind = (formData.get("kind") as string) || "CONTRACT";
  if (!file) throw new Error("Δεν δόθηκε αρχείο");

  if (!ALLOWED_MIME.includes(file.type)) {
    throw new Error(`Μη υποστηριζόμενος τύπος αρχείου: ${file.type || "άγνωστος"}`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`Το αρχείο ξεπερνά τα 20 MB (${Math.round(file.size / 1024 / 1024)} MB)`);
  }

  const count = await prisma.intakeDocument.count({ where: { intakeId } });
  if (count >= MAX_FILES) throw new Error(`Έως ${MAX_FILES} αρχεία ανά πρόσληψη`);

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileHash = createHash("sha256").update(buffer).digest("hex");

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const remotePath = `intake/${intakeId}/${fileHash.slice(0, 12)}.${ext}`;
  const fileUrl = await uploadToBunny(buffer, remotePath, file.type);

  const doc = await prisma.intakeDocument.create({
    data: {
      intakeId,
      fileName: file.name,
      fileUrl,
      fileHash,
      mimeType: file.type,
      sizeBytes: file.size,
      kind: kind as never,
    },
  });

  revalidatePath(`/intake/${intakeId}`);
  return doc.id;
}

/** Άλλα intakes που περιέχουν ήδη το ίδιο αρχείο — προειδοποίηση, όχι εμπόδιο. */
export async function findDuplicateDocuments(intakeId: string) {
  await requireUserId();
  const docs = await prisma.intakeDocument.findMany({
    where: { intakeId },
    select: { fileHash: true, fileName: true },
  });
  if (docs.length === 0) return [];

  const dupes = await prisma.intakeDocument.findMany({
    where: { fileHash: { in: docs.map((d) => d.fileHash) }, intakeId: { not: intakeId } },
    select: { fileHash: true, intakeId: true, intake: { select: { title: true } } },
  });

  return dupes.map((d) => ({
    fileName: docs.find((x) => x.fileHash === d.fileHash)?.fileName ?? "",
    otherIntakeId: d.intakeId,
    otherIntakeTitle: d.intake.title,
  }));
}

/** Γράφει τα εξαχθέντα μέρη ως `IntakeParty`, με αντιστοίχιση και side. */
export async function persistExtraction(intakeId: string, extraction: Extraction) {
  await requireUserId();
  const candidates = await getOwnGroupCandidates();

  await prisma.$transaction(async (tx) => {
    await tx.intakeParty.deleteMany({ where: { intakeId } });

    for (const p of extraction.parties) {
      const match = matchParty({ name: p.name, vat: p.vat }, candidates);
      await tx.intakeParty.create({
        data: {
          intakeId,
          // "org" είναι η μαμά (Organization), όχι εγγραφή Company.
          companyId: match && match.candidateId !== "org" ? match.candidateId : null,
          side: (match?.side ?? "EXTERNAL") as never,
          matchMethod: (match?.method ?? "NONE") as never,
          matchScore: match?.score ?? null,
          extractedName: p.name,
          extractedVat: p.vat,
          extractedAddress: p.address,
          extractedRep: p.representative,
          extractedEmail: p.email,
        },
      });
    }

    await tx.complianceIntake.update({
      where: { id: intakeId },
      data: { extraction: extraction as never, stage: "MATCHING", status: "PROCESSING" },
    });
  });

  revalidatePath(`/intake/${intakeId}`);
}

/** Γράφει τους προτεινόμενους ρόλους και τα κενά. */
export async function persistReasoning(intakeId: string, reasoning: Reasoning) {
  await requireUserId();
  const parties = await prisma.intakeParty.findMany({ where: { intakeId } });

  await prisma.$transaction(async (tx) => {
    for (const pr of reasoning.partyRoles) {
      const party = parties.find((p) => p.extractedName === pr.name);
      if (!party) continue; // ό,τι δεν αντιστοιχεί σε μέρος αγνοείται σιωπηλά
      await tx.intakeParty.update({
        where: { id: party.id },
        data: {
          proposedRole: pr.role as never,
          confirmedRole: pr.role as never, // προσυμπληρωμένο· ο χρήστης το αλλάζει
          roleRationale: pr.rationale,
          gdprArticles: pr.gdprArticles as never,
        },
      });
    }

    await tx.intakeGap.deleteMany({ where: { intakeId } });
    for (const g of reasoning.gaps) {
      await tx.intakeGap.create({
        data: {
          intakeId,
          category: g.category as never,
          severity: g.severity as never,
          title: g.title,
          description: g.description,
          remedyType: g.remedyType as never,
          gdprArticles: g.gdprArticles as never,
        },
      });
    }

    await tx.complianceIntake.update({
      where: { id: intakeId },
      data: { reasoning: reasoning as never, stage: "REVIEW", status: "AWAITING_REVIEW" },
    });
  });

  revalidatePath(`/intake/${intakeId}`);
}

export async function setPartyRole(partyId: string, role: PartyRoleValue, side: string) {
  await requireUserId();
  const party = await prisma.intakeParty.update({
    where: { id: partyId },
    data: { confirmedRole: role as never, side: side as never },
  });
  await logAction({
    action: "UPDATE",
    entity: "IntakeParty",
    entityId: partyId,
    details: { confirmedRole: role, side },
  });
  revalidatePath(`/intake/${party.intakeId}`);
}

export async function setGapStatus(gapId: string, status: string, dismissReason?: string) {
  await requireUserId();
  if (status === "DISMISSED" && !dismissReason?.trim()) {
    throw new Error("Η απόρριψη κενού απαιτεί αιτιολογία");
  }
  const gap = await prisma.intakeGap.update({
    where: { id: gapId },
    data: { status: status as never, dismissReason: dismissReason?.trim() || null },
  });
  await logAction({
    action: "UPDATE",
    entity: "IntakeGap",
    entityId: gapId,
    details: { status, dismissReason: dismissReason?.trim() || null },
  });
  revalidatePath(`/intake/${gap.intakeId}`);
}

/** Τι εμποδίζει το commit — για να το δείχνει το UI πριν πατηθεί το κουμπί. */
export async function checkCommit(intakeId: string) {
  await requireUserId();
  const [parties, gaps] = await Promise.all([
    prisma.intakeParty.findMany({ where: { intakeId }, select: { side: true, confirmedRole: true } }),
    prisma.intakeGap.findMany({ where: { intakeId }, select: { severity: true, status: true, dismissReason: true } }),
  ]);
  return canCommit(parties as PartyState[], gaps as GapState[]);
}

const RISK_BY_SEVERITY: Record<string, "CRITICAL" | "HIGH" | "MEDIUM"> = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
};

export async function commitIntake(intakeId: string) {
  const userId = await requireUserId();

  const verdict = await checkCommit(intakeId);
  if (!verdict.allowed) throw new Error(verdict.reasons.join(" "));

  const [intake, parties, gaps] = await Promise.all([
    prisma.complianceIntake.findUniqueOrThrow({ where: { id: intakeId } }),
    prisma.intakeParty.findMany({ where: { intakeId } }),
    prisma.intakeGap.findMany({ where: { intakeId } }),
  ]);

  const external = parties.filter((p) => p.side === "EXTERNAL");
  const clientName = external[0]?.extractedName ?? "—";

  const openSeverities = gaps.filter((g) => g.status !== "DISMISSED").map((g) => g.severity as string);
  const riskLevel =
    RISK_BY_SEVERITY[openSeverities.find((s) => RISK_BY_SEVERITY[s]) ?? ""] ?? "MEDIUM";

  const projectId = await prisma.$transaction(async (tx) => {
    // Ξαναδιαβάζουμε ΜΕΣΑ στη συναλλαγή: ανάμεσα στον έλεγχο και εδώ μπορεί
    // να έχει ήδη γίνει commit από δεύτερο κλικ ή επανάληψη αιτήματος.
    const fresh = await tx.complianceIntake.findUniqueOrThrow({
      where: { id: intakeId },
      select: { status: true, projectId: true },
    });
    if (fresh.status === "COMMITTED" && fresh.projectId) return fresh.projectId;

    const project = await tx.project.create({
      data: {
        name: intake.title,
        clientName,
        description: (intake.extraction as { subject?: string } | null)?.subject ?? null,
        riskLevel: riskLevel as never,
      },
    });

    // Ο ρόλος μας ↔ ρόλος αντισυμβαλλομένου → DpaContract ανά έγκυρο ζεύγος
    for (const ours of parties.filter((p) => p.side !== "EXTERNAL")) {
      for (const theirs of external) {
        const dpaRole = toDpaRole(
          ours.confirmedRole as PartyRoleValue,
          theirs.confirmedRole as PartyRoleValue
        );
        if (!dpaRole) continue;

        const weAreController = dpaRole === "COMPANY_AS_PROCESSOR";
        await tx.dpaContract.create({
          data: {
            projectId: project.id,
            userId,
            companyId: theirs.companyId,
            roleInDpa: dpaRole as never,
            title: `DPA — ${ours.extractedName} / ${theirs.extractedName}`,
            controllerName: weAreController ? ours.extractedName : theirs.extractedName,
            controllerVat: weAreController ? ours.extractedVat : theirs.extractedVat,
            processorName: weAreController ? theirs.extractedName : ours.extractedName,
            processorVat: weAreController ? theirs.extractedVat : ours.extractedVat,
            dataCategories: ((intake.extraction as { dataCategories?: string[] } | null)?.dataCategories ?? []) as never,
            purposes: [] as never,
            retentionPeriod: "Προς συμπλήρωση",
            status: "PENDING",
          },
        });
      }
    }

    await tx.complianceIntake.update({
      where: { id: intakeId },
      data: { projectId: project.id, status: "COMMITTED" },
    });

    return project.id;
  });

  await logAction({
    action: "COMMIT",
    entity: "ComplianceIntake",
    entityId: intakeId,
    projectId,
    details: { parties: parties.length, gaps: gaps.length },
  });

  revalidatePath("/intake");
  revalidatePath(`/intake/${intakeId}`);
  return projectId;
}
