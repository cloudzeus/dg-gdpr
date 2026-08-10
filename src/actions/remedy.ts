"use server";

import type { IntakeGap } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";
import { logAction } from "@/lib/action-logger";
import { revalidatePath } from "next/cache";
import { buildRemedyContext } from "@/lib/remedy/context";
import { executeRemedy } from "@/lib/remedy";
import type { RemedyContext, RemedyResult } from "@/lib/remedy/types";

/**
 * Ενεργοποιεί το «Κάλυψη όλων» και το μεμονωμένο «Κάλυψε» του βήματος 5.
 *
 * Η καταγραφή στο AuditLog ζει ΕΔΩ, όχι μέσα σε κάθε εκτελεστή — έτσι κάθε
 * εκτέλεση, επιτυχής ή μη, αφήνει ΑΚΡΙΒΩΣ μία εγγραφή ελέγχου, ανεξάρτητα από
 * το πόσες φορές ο εκτελεστής άγγιξε τη βάση εσωτερικά.
 */
async function applyResult(gapId: string, remedyType: string | null, result: RemedyResult): Promise<void> {
  if (result.status === "CREATED") {
    await prisma.intakeGap.update({
      where: { id: gapId },
      data: {
        status: "DRAFTED",
        createdEntityType: result.entityType,
        createdEntityId: result.entityId,
      },
    });
  }

  await logAction({
    action: "EXECUTE_REMEDY",
    entity: "IntakeGap",
    entityId: gapId,
    details: { remedyType, result },
  });
}

/** Ένα σφάλμα σε ένα κενό δεν πρέπει να ανατρέπει τα υπόλοιπα — μετατρέπεται σε SKIPPED. */
async function runRemedySafely(gap: IntakeGap, ctx: RemedyContext): Promise<RemedyResult> {
  try {
    return await executeRemedy(gap, ctx);
  } catch (e) {
    return {
      status: "SKIPPED" as const,
      reason: `Προέκυψε σφάλμα κατά την εκτέλεση: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

export async function executeGapRemedy(gapId: string): Promise<RemedyResult> {
  const userId = await requireUserId();
  const gap = await prisma.intakeGap.findUniqueOrThrow({ where: { id: gapId } });
  const ctx = await buildRemedyContext(gap.intakeId, userId);

  const result = await runRemedySafely(gap, ctx);
  await applyResult(gap.id, gap.remedyType, result);

  revalidatePath(`/intake/${gap.intakeId}`);
  return result;
}

export async function executeAllRemedies(intakeId: string): Promise<Record<string, RemedyResult>> {
  const userId = await requireUserId();
  // Το context χτίζεται ΜΙΑ φορά για όλο το intake — όχι ανά κενό.
  const ctx = await buildRemedyContext(intakeId, userId);
  const gaps = await prisma.intakeGap.findMany({ where: { intakeId } });

  const results: Record<string, RemedyResult> = {};

  // Σειριακά, όχι Promise.all: κάθε κενό με AI καλεί το DeepSeek, και
  // παράλληλες κλήσεις θα χτυπούσαν rate limits.
  for (const gap of gaps) {
    const result = await runRemedySafely(gap, ctx);
    await applyResult(gap.id, gap.remedyType, result);
    results[gap.id] = result;
  }

  revalidatePath(`/intake/${intakeId}`);
  return results;
}

/** Οι δύο μορφές του άρθρου 28 είναι εναλλακτικές — αλλάζει μόνο τον τύπο κάλυψης του κενού. */
export async function setDpaForm(gapId: string, form: "STANDALONE" | "CLAUSES"): Promise<void> {
  await requireUserId();

  const gap = await prisma.intakeGap.findUniqueOrThrow({ where: { id: gapId } });
  if (gap.remedyType !== "CREATE_DPA" && gap.remedyType !== "CREATE_CONTRACT_CLAUSES") {
    throw new Error("Αυτό το κενό δεν αφορά DPA ή ρήτρες σύμβασης.");
  }

  const remedyType = form === "STANDALONE" ? "CREATE_DPA" : "CREATE_CONTRACT_CLAUSES";
  await prisma.intakeGap.update({ where: { id: gapId }, data: { remedyType } });

  await logAction({ action: "UPDATE", entity: "IntakeGap", entityId: gapId, details: { remedyType } });
  revalidatePath(`/intake/${gap.intakeId}`);
}
