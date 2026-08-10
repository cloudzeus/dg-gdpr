// src/app/api/intake/ocr/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";
import { readDocument, estimatePageCount } from "@/lib/intake/ocr";

export const maxDuration = 300;

/** Διαβάζει ΕΝΑ έγγραφο. Ο client καλεί παράλληλα, ένα request ανά αρχείο. */
export async function POST(req: NextRequest) {
  try {
    await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { documentId } = await req.json();
  if (!documentId) return NextResponse.json({ error: "Λείπει το documentId" }, { status: 400 });

  const doc = await prisma.intakeDocument.findUnique({ where: { id: documentId } });
  if (!doc) return NextResponse.json({ error: "Το έγγραφο δεν βρέθηκε" }, { status: 404 });

  await prisma.intakeDocument.update({
    where: { id: doc.id },
    data: { ocrStatus: "RUNNING", ocrError: null },
  });

  try {
    const escalationsUsed = await prisma.intakeDocument.count({
      where: { intakeId: doc.intakeId, escalated: true },
    });
    const maxEscalations = Number(process.env.INTAKE_MAX_PRO_ESCALATIONS ?? 5);

    const res = await fetch(doc.fileUrl);
    if (!res.ok) throw new Error(`Δεν κατέβηκε το αρχείο (${res.status})`);
    const buffer = Buffer.from(await res.arrayBuffer());

    const pageCount = doc.pageCount ?? estimatePageCount(buffer, doc.mimeType);

    const result = await readDocument(
      { buffer, mimeType: doc.mimeType, pageCount },
      { escalationsLeft: Math.max(0, maxEscalations - escalationsUsed) }
    );

    await prisma.intakeDocument.update({
      where: { id: doc.id },
      data: {
        pageCount,
        ocrText: result.text,
        ocrModel: result.model,
        ocrQuality: result.quality,
        escalated: result.escalated,
        ocrStatus: "DONE",
      },
    });

    return NextResponse.json({
      quality: result.quality,
      model: result.model,
      escalated: result.escalated,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // Η αποτυχία απομονώνεται στο έγγραφο — τα υπόλοιπα συνεχίζουν.
    await prisma.intakeDocument.update({
      where: { id: doc.id },
      data: { ocrStatus: "FAILED", ocrError: message },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
