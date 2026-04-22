import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildReportsWord } from "@/lib/export-word";
import { scoreToGrade } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [org, devChecklists, voipConfigs, trainingResults, dpiaReports, projects] =
    await Promise.all([
      prisma.organization.findFirst({ select: { name: true } }),
      prisma.devChecklist.findMany({ select: { score: true } }),
      prisma.voIPConfig.findMany({ select: { recordingEnabled: true, encryptionEnabled: true, legalBasis: true } }),
      prisma.trainingResult.findMany({ select: { passed: true, score: true } }),
      prisma.dpiaReport.findMany({ select: { status: true } }),
      prisma.project.findMany({
        select: { id: true, _count: { select: { dpiaReports: true, dpaContracts: true } } },
      }),
    ]);

  const devScore = devChecklists.length
    ? devChecklists.reduce((a, c) => a + c.score, 0) / devChecklists.length
    : null;

  const voipScore = voipConfigs.length
    ? voipConfigs.reduce((a, c) => {
        let s = 0;
        if (c.legalBasis) s += 40;
        if (c.encryptionEnabled) s += 40;
        if (!c.recordingEnabled || c.legalBasis) s += 20;
        return a + s;
      }, 0) / voipConfigs.length
    : null;

  const trainingScore = trainingResults.length
    ? (trainingResults.filter((r) => r.passed).length / trainingResults.length) * 100
    : null;

  const dpiaScore = dpiaReports.length
    ? dpiaReports.reduce((acc, r) => {
        const pts =
          r.status === "APPROVED" ? 100 :
          r.status === "IN_REVIEW" ? 75 :
          r.status === "DRAFT" ? 50 :
          r.status === "REQUIRES_CONSULTATION" ? 40 : 0;
        return acc + pts;
      }, 0) / dpiaReports.length
    : null;

  const active = [devScore, voipScore, trainingScore, dpiaScore].filter((s): s is number => s !== null);
  const overallScore = active.length ? Math.round(active.reduce((a, b) => a + b, 0) / active.length) : 0;
  const grade = scoreToGrade(overallScore);

  const coverage = [
    { label: "DPIA + DPA", value: projects.filter((p) => p._count.dpiaReports > 0 && p._count.dpaContracts > 0).length },
    { label: "Μόνο DPIA", value: projects.filter((p) => p._count.dpiaReports > 0 && p._count.dpaContracts === 0).length },
    { label: "Μόνο DPA", value: projects.filter((p) => p._count.dpiaReports === 0 && p._count.dpaContracts > 0).length },
    { label: "Χωρίς κάλυψη", value: projects.filter((p) => p._count.dpiaReports === 0 && p._count.dpaContracts === 0).length },
  ];

  const buf = await buildReportsWord({
    overallScore,
    grade: grade.label,
    modules: [
      { label: "Ανάπτυξη", score: devScore !== null ? Math.round(devScore) : null, fill: "#0078d4" },
      { label: "VoIP", score: voipScore !== null ? Math.round(voipScore) : null, fill: "#8b5cf6" },
      { label: "Εκπαίδευση", score: trainingScore !== null ? Math.round(trainingScore) : null, fill: "#10b981" },
      { label: "DPIA", score: dpiaScore !== null ? Math.round(dpiaScore) : null, fill: "#f59e0b" },
    ],
    coverage,
    companyName: org?.name,
  });

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="gdpr-compliance-report-${date}.docx"`,
    },
  });
}
