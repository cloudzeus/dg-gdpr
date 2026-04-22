import { Topbar } from "@/components/layout/topbar";
import { auth } from "@/lib/auth";
import { getMyTrainingResults } from "@/actions/training";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { GraduationCap, Clock, Award, ChevronRight } from "lucide-react";

export default async function MyTrainingPage() {
  const session = await auth();
  const results = await getMyTrainingResults();

  const passedCount = results.filter((r) => r.passed).length;
  const averageScore =
    results.length > 0 ? results.reduce((s, r) => s + r.score, 0) / results.length : 0;

  // Best score per module
  const byModule = new Map<string, typeof results[0]>();
  for (const r of results) {
    const existing = byModule.get(r.moduleId);
    if (!existing || r.score > existing.score) byModule.set(r.moduleId, r);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar userName={session?.user?.name} userRole={(session?.user as any)?.role} pageTitle="Οι Εκπαιδεύσεις μου" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <SummaryCard icon={GraduationCap} label="Τεστ" value={results.length.toString()} />
            <SummaryCard icon={Award} label="Επιτυχή" value={passedCount.toString()} />
            <SummaryCard icon={Clock} label="Μ.Ο. Βαθμού" value={`${Math.round(averageScore)}%`} />
          </div>

          {/* Best per module */}
          {byModule.size > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Καλύτερη Βαθμολογία ανά Ενότητα</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {Array.from(byModule.values()).map((r) => (
                    <Link
                      key={r.id}
                      href={`/training/${r.moduleId}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors"
                    >
                      <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{r.module.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Απαιτούμενο: {r.module.passingScore}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${r.passed ? "text-green-600" : "text-red-600"}`}>
                          {Math.round(r.score)}%
                        </p>
                        {r.passed ? (
                          <Badge variant="success" className="text-[10px]">Πέρασε</Badge>
                        ) : (
                          <Badge variant="warning" className="text-[10px]">Εκκρεμεί</Badge>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Full history */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Πλήρες Ιστορικό Προσπαθειών</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {results.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Δεν έχετε ολοκληρώσει ακόμη κάποιο τεστ.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40 text-xs uppercase text-muted-foreground">
                      <th className="px-4 py-2 text-left font-semibold">Ενότητα</th>
                      <th className="px-4 py-2 text-center font-semibold">Βαθμός</th>
                      <th className="px-4 py-2 text-center font-semibold">Προσπάθεια</th>
                      <th className="px-4 py-2 text-right font-semibold">Ημερομηνία</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.id} className="border-b border-border hover:bg-secondary/30">
                        <td className="px-4 py-2.5">
                          <Link href={`/training/${r.moduleId}`} className="hover:text-primary transition-colors">
                            {r.module.title}
                          </Link>
                        </td>
                        <td className={`px-4 py-2.5 text-center font-semibold ${r.passed ? "text-green-600" : "text-red-600"}`}>
                          {Math.round(r.score)}%
                        </td>
                        <td className="px-4 py-2.5 text-center text-xs">#{r.retryCount + 1}</td>
                        <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                          {r.completedAt.toLocaleString("el-GR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({
  icon: Icon, label, value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
