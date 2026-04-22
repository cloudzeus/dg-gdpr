import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { LegalSidebar } from "@/components/shared/legal-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComplianceCharts } from "@/components/modules/compliance-charts";
import { PdfExportButton } from "@/components/modules/pdf-export-button";
import { BarChart3 } from "lucide-react";
import { scoreToGrade } from "@/lib/utils";

export default async function ReportsPage() {
  const session = await auth();

  const [
    devChecklists,
    voipConfigs,
    trainingResults,
    dpiaReports,
    projects,
  ] = await Promise.all([
    prisma.devChecklist.findMany({ select: { score: true } }),
    prisma.voIPConfig.findMany({ select: { recordingEnabled: true, encryptionEnabled: true, legalBasis: true } }),
    prisma.trainingResult.findMany({ select: { passed: true, score: true } }),
    prisma.dpiaReport.findMany({ select: { status: true } }),
    prisma.project.findMany({
      select: {
        id: true,
        name: true,
        _count: { select: { dpiaReports: true, dpaContracts: true } },
      },
    }),
  ]);

  // Scores — null means "no data yet" (excluded from overall average)
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

  // Partial credit per DPIA status so DRAFT/IN_REVIEW are not penalised as 0
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

  // Only average categories that have at least one record
  const activeScores = [devScore, voipScore, trainingScore, dpiaScore].filter(
    (s): s is number => s !== null
  );
  const overallScore = activeScores.length
    ? activeScores.reduce((a, b) => a + b, 0) / activeScores.length
    : 0;
  const grade = scoreToGrade(overallScore);

  const chartData = [
    { label: "Ανάπτυξη", score: devScore !== null ? Math.round(devScore) : null, fill: "#0078d4" },
    { label: "VoIP", score: voipScore !== null ? Math.round(voipScore) : null, fill: "#8b5cf6" },
    { label: "Εκπαίδευση", score: trainingScore !== null ? Math.round(trainingScore) : null, fill: "#10b981" },
    { label: "DPIA", score: dpiaScore !== null ? Math.round(dpiaScore) : null, fill: "#f59e0b" },
  ];

  // Compliance coverage: how many projects have DPIA and/or DPA
  const coverageDistribution = [
    {
      label: "DPIA + DPA",
      value: projects.filter((p) => p._count.dpiaReports > 0 && p._count.dpaContracts > 0).length,
      fill: "#16a34a",
    },
    {
      label: "Μόνο DPIA",
      value: projects.filter((p) => p._count.dpiaReports > 0 && p._count.dpaContracts === 0).length,
      fill: "#0078d4",
    },
    {
      label: "Μόνο DPA",
      value: projects.filter((p) => p._count.dpiaReports === 0 && p._count.dpaContracts > 0).length,
      fill: "#8b5cf6",
    },
    {
      label: "Χωρίς κάλυψη",
      value: projects.filter((p) => p._count.dpiaReports === 0 && p._count.dpaContracts === 0).length,
      fill: "#dc2626",
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar userName={session?.user?.name} userRole={(session?.user as any)?.role} pageTitle="Αναφορές & Βαθμολογία Συμμόρφωσης" />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 space-y-6">
            {/* Score summary */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" /> Συνολική Βαθμολογία Συμμόρφωσης
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Βάσει ολοκληρωμένων αξιολογήσεων σε όλους τους τομείς
                </p>
              </div>
              <PdfExportButton />
            </div>

            {/* Overall score card */}
            <Card className={`border-2 ${grade.color.replace("text-", "border-").replace("-600", "-300")}`}>
              <CardContent className="p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
                <div className={`flex h-24 w-24 items-center justify-center rounded-2xl ${grade.bg} shrink-0`}>
                  <div className="text-center">
                    <p className={`text-3xl font-black ${grade.color}`}>{Math.round(overallScore)}%</p>
                    <p className={`text-xs font-semibold ${grade.color}`}>{grade.label}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 flex-1 sm:grid-cols-4">
                  {chartData.map((d) => (
                    <div key={d.label} className="text-center">
                      {d.score !== null ? (
                        <p className="text-2xl font-bold" style={{ color: d.fill }}>{d.score}%</p>
                      ) : (
                        <p className="text-xl font-bold text-muted-foreground">—</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">{d.label}</p>
                      {d.score === null && <p className="text-[10px] text-muted-foreground">Χωρίς δεδομένα</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Charts */}
            <ComplianceCharts chartData={chartData} riskData={coverageDistribution} />
          </div>

          <LegalSidebar
            title="Τεκμηρίωση Συμμόρφωσης"
            summary="Τα αρχεία βαθμολογίας και αναφορών αποτελούν αποδεικτικά στοιχεία συμμόρφωσης για εποπτικές αρχές."
            articles={[
              { number: "5(2)", title: "Λογοδοσία", summary: "Ο υπεύθυνος επεξεργασίας πρέπει να μπορεί να αποδείξει τη συμμόρφωσή του." },
              { number: "58", title: "Εξουσίες Εποπτικής Αρχής", summary: "Η ΑΠΔΠΧ μπορεί να ζητήσει πρόσβαση σε αρχεία και αναφορές συμμόρφωσης." },
            ]}
            tips={[
              "Εξάγετε PDF αναφορά μηνιαία για αρχειοθέτηση",
              "Στόχος: >80% σε όλους τους τομείς",
              "Βαθμολογία <60% = άμεση ανάγκη διορθωτικών ενεργειών",
            ]}
          />
        </div>
      </main>
    </div>
  );
}
