import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — portability: download the subject's own data as JSON.
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const record = await prisma.consentRecord.findUnique({ where: { verifyToken: token }, include: { project: { include: { purposes: true } } } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const payload = {
    project: { name: record.project.name, slug: record.project.slug },
    subject: { email: record.subjectEmail, phone: record.subjectPhone },
    values: record.values,
    purposeConsents: record.purposeConsents,
    status: record.status,
    confirmedAt: record.confirmedAt,
    withdrawnAt: record.withdrawnAt,
    createdAt: record.createdAt,
  };
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="my-data-${record.project.slug}.json"`,
    },
  });
}
