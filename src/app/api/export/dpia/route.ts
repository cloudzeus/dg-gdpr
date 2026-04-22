import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildDpiaWord } from "@/lib/export-dpia-word";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const report = await prisma.dpiaReport.findUnique({
    where: { id },
    include: {
      project: { select: { name: true } },
      user: { select: { name: true } },
    },
  });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const buf = await buildDpiaWord({
    title: report.title,
    projectName: report.project?.name ?? "—",
    createdBy: report.user.name ?? "—",
    createdAt: report.createdAt,
    status: report.status,
    processingPurpose: report.processingPurpose,
    risksIdentified: (report.risksIdentified as string[]) ?? [],
    riskMitigation: (report.riskMitigation as string[]) ?? [],
    necessityAssessed: report.necessityAssessed,
    dpoConsulted: report.dpoConsulted,
    dpoName: report.dpoName,
    supervisoryBody: report.supervisoryBody,
  });

  const safeName = report.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase().slice(0, 40);

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="dpia-${safeName}-${new Date().toISOString().slice(0, 10)}.docx"`,
    },
  });
}
