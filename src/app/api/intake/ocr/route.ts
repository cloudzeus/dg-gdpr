// src/app/api/intake/ocr/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";
import { readDocument, estimatePageCount } from "@/lib/intake/ocr";

export const maxDuration = 300;

/**
 * Δεσμεύει ατομικά μία θέση κλιμάκωσης. Το κλείδωμα στη γραμμή του intake
 * σειριοποιεί μόνο τη στιγμή της δέσμευσης — όχι την ίδια την ανάγνωση, που
 * κρατά λεπτά. Σημειώνει το `escalated` ΠΡΙΝ την κλήση: αν το ακριβό μοντέλο
 * αποτύχει, το κόστος έχει ήδη προκύψει και πρέπει να μετρήσει.
 */
async function reserveEscalationSlot(intakeId: string, documentId: string): Promise<boolean> {
  const cap = Number(process.env.INTAKE_MAX_PRO_ESCALATIONS ?? 5);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM ComplianceIntake WHERE id = ${intakeId} FOR UPDATE`;
    const used = await tx.intakeDocument.count({ where: { intakeId, escalated: true } });
    if (used >= cap) return false;
    await tx.intakeDocument.update({ where: { id: documentId }, data: { escalated: true } });
    return true;
  });
}

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
    const res = await fetch(doc.fileUrl);
    if (!res.ok) throw new Error(`Δεν κατέβηκε το αρχείο (${res.status})`);
    const buffer = Buffer.from(await res.arrayBuffer());

    const pageCount = doc.pageCount ?? estimatePageCount(buffer, doc.mimeType);

    const result = await readDocument(
      { buffer, mimeType: doc.mimeType, pageCount },
      { reserveEscalation: () => reserveEscalationSlot(doc.intakeId, doc.id) }
    );

    await prisma.intakeDocument.update({
      where: { id: doc.id },
      data: {
        pageCount,
        ocrText: result.text,
        ocrModel: result.model,
        ocrQuality: result.quality,
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
