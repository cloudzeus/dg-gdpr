import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ComplianceGauge } from "@/components/modules/compliance-gauge";
import { RecentAuditLog } from "@/components/modules/recent-audit-log";
import { scoreToGrade } from "@/lib/utils";
import { getComplianceLevel, ASSESSMENT_CATEGORIES, calculateCategoryScore, getOverallScore } from "@/lib/assessment-questions";
import {
  Shield, Code2, Phone, FileText, GraduationCap,
  AlertTriangle, CheckCircle2, Clock, TrendingUp, ClipboardCheck,
} from "lucide-react";
import Link from "next/link";

async function getDashboardData(userId: string) {
  const [
    projectsCount,
    checklistsCount,
    voipCount,
    dpiaCount,
    trainingPassed,
    pendingErasure,
    recentLogs,
    assessmentRows,
  ] = await Promise.all([
    prisma.project.count(),
    prisma.devChecklist.count(),
    prisma.voIPConfig.count(),
    prisma.dpiaReport.count(),
    prisma.trainingResult.count({ where: { userId, passed: true } }),
    prisma.erasureRequest.count({ where: { status: "PENDING" } }).catch(() => 0),
    prisma.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.assessment.findMany({
      where: { type: "SECURITY_AUDIT" },
      select: { title: true, answers: true, score: true },
    }),
  ]);

  const categoryAnswers: Record<string, Record<string, any>> = {};
  for (const row of assessmentRows) {
    if (row.title) categoryAnswers[row.title] = (row.answers as any) ?? {};
  }
  const totalScore = getOverallScore(categoryAnswers);

  // Per-category scores for the breakdown
  const categoryScores = ASSESSMENT_CATEGORIES.map((cat) => ({
    label: cat.title,
    pct: calculateCategoryScore(cat.questions, categoryAnswers[cat.id] ?? {}).percentage,
    answered: Object.values(categoryAnswers[cat.id] ?? {}).filter((v) => v !== null).length,
    total: cat.questions.length,
  }));

  return { projectsCount, checklistsCount, voipCount, dpiaCount, trainingPassed, pendingErasure, recentLogs, totalScore, categoryScores };
}

export default async function DashboardPage() {
  const session = await auth();
  const data = await getDashboardData(session!.user!.id!);

  const grade = scoreToGrade(data.totalScore);

  const stats = [
    { label: "Ενεργά Έργα", value: data.projectsCount, icon: Code2, color: "text-blue-500", href: "/dev" },
    { label: "Έλεγχοι Privacy", value: data.checklistsCount, icon: Shield, color: "text-green-500", href: "/dev" },
    { label: "Εκκρεμή Αιτήματα Λήθης", value: data.pendingErasure, icon: GraduationCap, color: "text-red-500", href: "/erasure" },
    { label: "Αναφορές DPIA", value: data.dpiaCount, icon: FileText, color: "text-orange-500", href: "/dpia" },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        userName={session?.user?.name}
        userRole={(session?.user as any)?.role}
        pageTitle="Πίνακας Ελέγχου"
      />
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Welcome */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              Καλωσορίσατε, {session?.user?.name?.split(" ")[0] ?? "Χρήστη"} 👋
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Επισκόπηση κατάστασης συμμόρφωσης GDPR — {new Date().toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <Badge variant={data.totalScore >= 75 ? "success" : data.totalScore >= 50 ? "warning" : "destructive"}>
            {grade.label}
          </Badge>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <Link key={s.label} href={s.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
                  <s.icon className={`h-6 w-6 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{s.label}</p>
                </div>
              </CardContent>
            </Card>
            </Link>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Compliance Gauge */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Βαθμός Συμμόρφωσης
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <ComplianceGauge score={data.totalScore} />
              <div className="w-full space-y-2.5">
                {data.categoryScores.slice(0, 4).map((cat) => (
                  <div key={cat.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground truncate max-w-36">{cat.label}</span>
                      <span className="font-semibold ml-2 shrink-0">
                        {cat.answered > 0 ? `${cat.pct}%` : "—"}
                      </span>
                    </div>
                    <Progress value={cat.answered > 0 ? cat.pct : 0} className="h-1.5" />
                  </div>
                ))}
              </div>
              <Link href="/assessment" className="text-xs text-primary hover:underline">
                Δείτε πλήρη αξιολόγηση →
              </Link>
            </CardContent>
          </Card>

          {/* Quick status */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Στάτους Ενεργειών
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Ανεκπλήρωτες Αξιολογήσεις DPIA", count: 2, icon: Clock, color: "text-orange-500" },
                { label: "Ληγμένες Συμβάσεις DPA", count: 1, icon: AlertTriangle, color: "text-red-500" },
                { label: "Εκπαιδεύσεις χωρίς Επιτυχία", count: 3, icon: GraduationCap, color: "text-yellow-500" },
                { label: "Ολοκληρωμένοι Έλεγχοι Privacy", count: data.checklistsCount, icon: CheckCircle2, color: "text-green-500" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <span className="text-sm font-bold">{item.count}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent audit */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Πρόσφατη Δραστηριότητα</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentAuditLog logs={data.recentLogs} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
