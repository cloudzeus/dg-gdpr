// src/app/api/intake/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";
import { extractContract } from "@/lib/intake/extraction";
import { reasonAboutRoles } from "@/lib/intake/reasoning";
import { persistExtraction, persistReasoning } from "@/actions/intake";
import type { ComplianceProfile } from "@/lib/intake/compliance-profile";
import { buildComplianceProfile } from "@/lib/intake/compliance-profile";

export const maxDuration = 300;

/** Στάδια ⑤⑦ μαζί: εξαγωγή με Gemini, μετά νομική κρίση με DeepSeek. */
export async function POST(req: NextRequest) {
  try {
    await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { intakeId } = await req.json();
  if (!intakeId) return NextResponse.json({ error: "Λείπει το intakeId" }, { status: 400 });

  const intake = await prisma.complianceIntake.findUnique({
    where: { id: intakeId },
    include: { documents: true },
  });
  if (!intake) return NextResponse.json({ error: "Δεν βρέθηκε" }, { status: 404 });

  const readable = intake.documents.filter((d) => d.ocrText && d.ocrText.trim().length > 0);
  if (readable.length === 0) {
    return NextResponse.json({ error: "Κανένα έγγραφο δεν έχει διαβαστεί" }, { status: 400 });
  }

  try {
    await prisma.complianceIntake.update({
      where: { id: intakeId },
      data: { stage: "EXTRACTION", status: "PROCESSING", lastError: null },
    });

    const sources = await Promise.all(
      readable.map(async (d) => {
        const res = await fetch(d.fileUrl);
        return {
          text: d.ocrText!,
          buffer: Buffer.from(await res.arrayBuffer()),
          mimeType: d.mimeType,
        };
      })
    );

    const extraction = await extractContract(sources);
    await persistExtraction(intakeId, extraction);

    await prisma.complianceIntake.update({
      where: { id: intakeId },
      data: { stage: "REASONING" },
    });

    // Το αποθηκευμένο snapshot είναι το τεκμήριο· αν λείπει, χτίζεται τώρα.
    const profile =
      (intake.profileSnapshot as ComplianceProfile | null) ?? (await buildComplianceProfile());

    const reasoning = await reasonAboutRoles(extraction, profile);
    await persistReasoning(intakeId, reasoning);

    return NextResponse.json({
      parties: extraction.parties.length,
      gaps: reasoning.gaps.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await prisma.complianceIntake.update({
      where: { id: intakeId },
      data: { status: "FAILED", lastError: message },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
