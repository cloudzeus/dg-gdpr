import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildConsentExcel } from "@/lib/consent-excel";
import { loc } from "@/lib/localized";

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const project = await prisma.consentProject.findUnique({
    where: { id: projectId },
    include: { fields: { include: { field: true }, orderBy: { order: "asc" } }, purposes: { orderBy: { order: "asc" } } },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const records = await prisma.consentRecord.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } });

  const purposeLabels: Record<string, string> = {};
  for (const p of project.purposes) purposeLabels[p.id] = loc(p.label as unknown, "el");

  const buffer = await buildConsentExcel({
    projectName: project.name,
    fieldKeys: project.fields.map((f) => f.field.key),
    purposeLabels,
    records: records.map((r) => ({
      id: r.id,
      subjectEmail: r.subjectEmail,
      subjectPhone: r.subjectPhone,
      status: r.status,
      values: r.values as Record<string, unknown>,
      purposeConsents: r.purposeConsents as Record<string, boolean>,
      confirmedAt: r.confirmedAt,
      ipAddress: r.ipAddress,
      createdAt: r.createdAt,
    })),
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="consents-${project.slug}.xlsx"`,
    },
  });
}
