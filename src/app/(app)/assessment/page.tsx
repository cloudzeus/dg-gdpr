import { auth } from "@/lib/auth";
import { Topbar } from "@/components/layout/topbar";
import { LegalSidebar } from "@/components/shared/legal-sidebar";
import { getAllAssessmentAnswers, saveComplianceSnapshot, getComplianceSnapshots } from "@/actions/assessment";
import {
  ASSESSMENT_CATEGORIES,
  calculateCategoryScore,
  getComplianceLevel,
  getOverallScore,
} from "@/lib/assessment-questions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { ChevronRight, AlertTriangle, XCircle, History } from "lucide-react";
import { ActionPlanAiButton } from "@/components/modules/action-plan-ai-button";
import { ComplianceHistoryCard } from "@/components/modules/compliance-history-card";
import { prisma } from "@/lib/prisma";

export default async function AssessmentPage() {
  const session = await auth();
  const raw = await getAllAssessmentAnswers();
  const savedAnswers = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v.answers]));
  const overallScore = getOverallScore(savedAnswers);
  const overallLevel = getComplianceLevel(overallScore);

  // Save snapshot (deduplicates within same day)
  await saveComplianceSnapshot(savedAnswers);

  const snapshots = await getComplianceSnapshots();

  // Context for AI: does org have related data?
  const [org, dpiaCount, dpaCount, mapperCount] = await Promise.all([
    prisma.organization.findFirst({ select: { name: true } }),
    prisma.dpiaReport.count(),
    prisma.dpaContract.count(),
    prisma.dataMap.count(),
  ]);

  // Build gap list for AI
  const allGaps: { category: string; question: string; action: string; priority: string }[] = [];
  for (const cat of ASSESSMENT_CATEGORIES) {
    const answers = savedAnswers[cat.id] ?? {};
    for (const q of cat.questions) {
      const ans = answers[q.id];
      if (ans === "no" || ans === "partial") {
        allGaps.push({
          category: cat.title,
          question: q.text,
          action: ans === "no" ? q.actionIfNo : q.actionIfPartial,
          priority: q.priority,
        });
      }
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        userName={session?.user?.name}
        userRole={(session?.user as any)?.role}
        pageTitle="Αξιολόγηση Συμμόρφωσης GDPR"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-6">
          <div className="flex-1 space-y-6">

            {/* Overall score banner */}
            <div className={`rounded-xl border-2 p-6 ${overallLevel.bg} ${overallLevel.border}`}>
              <div className="flex items-center gap-6">
                <div className="text-center shrink-0">
                  <p className="text-5xl font-black">{overallScore}%</p>
                  <p className={`text-sm font-bold mt-1 ${overallLevel.color}`}>
                    {overallLevel.icon} {overallLevel.label}
                  </p>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold mb-1">Συνολικός Βαθμός Συμμόρφωσης</h2>
                  <p className="text-sm text-muted-foreground">{overallLevel.text}</p>
                  <div className="mt-3">
                    <Progress value={overallScore} />
                  </div>
                  <div className="flex gap-6 mt-3 text-xs text-muted-foreground">
                    <span>🟢 Συμμορφούμενο ≥80%</span>
                    <span>🟠 Μερικώς 50–79%</span>
                    <span>🔴 Μη Συμμορφούμενο &lt;50%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Category list */}
            <div className="space-y-3">
              <h3 className="font-semibold text-muted-foreground uppercase tracking-wide text-xs">
                Κατηγορίες Αξιολόγησης — {ASSESSMENT_CATEGORIES.length} τομείς
              </h3>
              {ASSESSMENT_CATEGORIES.map((cat) => {
                const answers = savedAnswers[cat.id] ?? {};
                const answered = Object.values(answers).filter((v) => v !== null).length;
                const { percentage } = calculateCategoryScore(cat.questions, answers);
                const isStarted = answered > 0;

                const gaps = cat.questions.filter(
                  (q) => answers[q.id] === "no" || answers[q.id] === "partial"
                ).length;

                const displayLevel = isStarted ? getComplianceLevel(percentage) : null;

                return (
                  <Link key={cat.id} href={`/assessment/${cat.id}`}>
                    <Card className="hover:shadow-md transition-all cursor-pointer group">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 text-xl
                            ${!isStarted ? "bg-secondary border-border" :
                              percentage >= 80 ? "bg-green-50 border-green-300 dark:bg-green-950/30 dark:border-green-700" :
                              percentage >= 50 ? "bg-orange-50 border-orange-300 dark:bg-orange-950/30 dark:border-orange-700" :
                              "bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-700"
                            }`}>
                            {!isStarted ? "—" : getComplianceLevel(percentage).icon}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-semibold">{cat.title}</h4>
                              <div className="flex items-center gap-2 shrink-0">
                                {isStarted && (
                                  <span className={`text-sm font-bold ${displayLevel!.color}`}>
                                    {percentage}%
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {answered}/{cat.questions.length} ερωτήσεις
                                </span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{cat.description}</p>
                            {isStarted && (
                              <div className="mt-2">
                                <Progress value={percentage} className="h-1.5" />
                              </div>
                            )}
                            {isStarted && gaps > 0 && (
                              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1.5 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {gaps} κενό{gaps !== 1 ? "α" : ""} συμμόρφωσης
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>

            {/* Gap action plan + AI proposal */}
            <GapActionPlan
              savedAnswers={savedAnswers}
              allGaps={allGaps}
              overallScore={overallScore}
              orgName={org?.name}
              hasDpia={dpiaCount > 0}
              hasDpa={dpaCount > 0}
              hasMapper={mapperCount > 0}
            />

            {/* Compliance history */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Ιστορικό Συμμόρφωσης
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ComplianceHistoryCard snapshots={snapshots as any} />
              </CardContent>
            </Card>
          </div>

          <LegalSidebar
            title="Αξιολόγηση GDPR"
            summary="Η αυτοαξιολόγηση αποτελεί απόδειξη λογοδοσίας (Άρθρο 5(2)) και βοηθά στον εντοπισμό κενών συμμόρφωσης πριν από έλεγχο."
            articles={[
              { number: "5(2)", title: "Λογοδοσία", summary: "Ο υπεύθυνος επεξεργασίας αποδεικνύει τη συμμόρφωση μέσω τεκμηρίωσης." },
              { number: "83", title: "Πρόστιμα", summary: "Μη συμμόρφωση: έως 4% παγκόσμιου τζίρου ή €20εκ. Η τεκμηρίωση μετριάζει πρόστιμα." },
              { number: "58", title: "Έλεγχος ΑΠΔΠΧ", summary: "Η ΑΠΔΠΧ ελέγχει και ζητά τεκμηρίωση συμμόρφωσης." },
            ]}
            tips={[
              "Εκτελείτε αξιολόγηση τουλάχιστον ετησίως",
              "🟢 ≥80% = καλή συμμόρφωση",
              "🟠 50-79% = μέτρα άμεσης βελτίωσης",
              "🔴 <50% = κρίσιμα κενά, κίνδυνος προστίμου",
            ]}
          />
        </div>
      </main>
    </div>
  );
}

function GapActionPlan({
  savedAnswers,
  allGaps,
  overallScore,
  orgName,
  hasDpia,
  hasDpa,
  hasMapper,
}: {
  savedAnswers: Record<string, Record<string, import("@/lib/assessment-questions").AnswerValue>>;
  allGaps: { category: string; question: string; action: string; priority: string }[];
  overallScore: number;
  orgName?: string;
  hasDpia: boolean;
  hasDpa: boolean;
  hasMapper: boolean;
}) {
  const criticalGaps = allGaps.filter((g) => g.priority === "critical");
  const highGaps = allGaps.filter((g) => g.priority === "high");

  if (criticalGaps.length === 0 && highGaps.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-muted-foreground uppercase tracking-wide text-xs">
        Σχέδιο Δράσης — {allGaps.length} ενέργειες απαιτούνται
      </h3>

      {criticalGaps.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400">
            <XCircle className="h-4 w-4" /> Κρίσιμα ({criticalGaps.length})
          </div>
          {criticalGaps.slice(0, 5).map((g, i) => (
            <div key={i} className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-3.5">
              <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">{g.category}</p>
              <p className="text-sm font-medium mb-1 line-clamp-2">{g.question}</p>
              <p className="text-xs text-red-700 dark:text-red-300">→ {g.action}</p>
            </div>
          ))}
          {criticalGaps.length > 5 && (
            <p className="text-xs text-muted-foreground text-center">+{criticalGaps.length - 5} ακόμη κρίσιμα κενά — συμπληρώστε τις αξιολογήσεις</p>
          )}
        </div>
      )}

      {highGaps.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-orange-600 dark:text-orange-400">
            <AlertTriangle className="h-4 w-4" /> Υψηλής Προτεραιότητας ({highGaps.length})
          </div>
          {highGaps.slice(0, 5).map((g, i) => (
            <div key={i} className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 p-3.5">
              <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-1">{g.category}</p>
              <p className="text-sm font-medium mb-1 line-clamp-2">{g.question}</p>
              <p className="text-xs text-orange-700 dark:text-orange-300">→ {g.action}</p>
            </div>
          ))}
          {highGaps.length > 5 && (
            <p className="text-xs text-muted-foreground text-center">+{highGaps.length - 5} ακόμη υψηλής προτεραιότητας</p>
          )}
        </div>
      )}

      {/* AI proposal section */}
      <div className="rounded-xl border border-violet-200 dark:border-violet-800 p-4 bg-violet-50/30 dark:bg-violet-950/10">
        <ActionPlanAiButton
          gaps={allGaps}
          overallScore={overallScore}
          orgName={orgName}
          hasDpia={hasDpia}
          hasDpa={hasDpa}
          hasMapper={hasMapper}
        />
      </div>
    </div>
  );
}
