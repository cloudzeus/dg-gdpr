import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST — withdraw consent + create a DataSubjectRequest so it enters the admin workflow.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const record = await prisma.consentRecord.findUnique({ where: { verifyToken: token }, include: { project: true } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (record.status !== "WITHDRAWN") {
    await prisma.consentRecord.update({
      where: { id: record.id },
      data: { status: "WITHDRAWN", withdrawnAt: new Date() },
    });
    await prisma.dataSubjectRequest.create({
      data: {
        type: "WITHDRAW_CONSENT",
        subjectName: record.subjectEmail,
        subjectEmail: record.subjectEmail,
        subjectPhone: record.subjectPhone,
        description: `Ανάκληση συναίνεσης από το consent project "${record.project.name}" (slug: ${record.project.slug}).`,
      },
    });
  }
  return NextResponse.json({ ok: true });
}
