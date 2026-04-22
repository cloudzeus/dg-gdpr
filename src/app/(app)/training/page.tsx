import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { LegalSidebar } from "@/components/shared/legal-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, BookOpen, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { TrainingInviteButton } from "@/components/modules/training-invite-button";

export default async function TrainingPage() {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;
  const isAdmin = role === "ADMIN" || role === "DPO";

  const [modules, myResults, departments, users] = await Promise.all([
    prisma.trainingModule.findMany({
      where: { isActive: true },
      include: {
        questions: { select: { id: true } },
        results: {
          where: { userId: session!.user!.id! },
          orderBy: { completedAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.trainingResult.findMany({
      where: { userId: session!.user!.id! },
      orderBy: { completedAt: "desc" },
      include: { module: { select: { title: true } } },
    }),
    isAdmin
      ? prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    isAdmin
      ? prisma.user.findMany({
          where: { isActive: true },
          select: { id: true, name: true, email: true, departmentId: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const passCount = myResults.filter((r) => r.passed).length;
  const totalModules = modules.length;
  const completionPct = totalModules > 0 ? Math.round((passCount / totalModules) * 100) : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar userName={session?.user?.name} userRole={(session?.user as any)?.role} pageTitle="Εκπαίδευση GDPR" />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 space-y-6">
            {/* Progress overview */}
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" /> Πρόοδος Εκπαίδευσης
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {passCount} από {totalModules} ενότητες ολοκληρωμένες
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-primary">{completionPct}%</p>
                    <p className="text-xs text-muted-foreground">Ολοκλήρωση</p>
                  </div>
                </div>
                <Progress value={completionPct} />
              </CardContent>
            </Card>

            {/* Modules grid */}
            <div>
              <h3 className="font-semibold mb-3">Διαθέσιμες Ενότητες Εκπαίδευσης</h3>
              {modules.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center space-y-3">
                    <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                    <p className="text-muted-foreground">Δεν υπάρχουν διαθέσιμες ενότητες εκπαίδευσης</p>
                    <p className="text-xs text-muted-foreground">Ο διαχειριστής μπορεί να δημιουργήσει ενότητες από τις Ρυθμίσεις</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {modules.map((mod) => {
                    const lastResult = mod.results[0];
                    const passed = lastResult?.passed;
                    const score = lastResult?.score ?? 0;

                    return (
                      <Card key={mod.id} className="overflow-hidden">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base line-clamp-2">{mod.title}</CardTitle>
                            {lastResult ? (
                              passed ? (
                                <Badge variant="success" className="gap-1 shrink-0">
                                  <CheckCircle2 className="h-3 w-3" /> Επιτυχία
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="gap-1 shrink-0">
                                  <XCircle className="h-3 w-3" /> Αποτυχία
                                </Badge>
                              )
                            ) : (
                              <Badge variant="secondary" className="gap-1 shrink-0">
                                <Clock className="h-3 w-3" /> Εκκρεμεί
                              </Badge>
                            )}
                          </div>
                          {mod.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{mod.description}</p>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{mod.questions.length} ερωτήσεις</span>
                            <span>{mod.durationMin} λεπτά</span>
                            <span>Βάσιμη βαθμολογία: {mod.passingScore}%</span>
                          </div>
                          {lastResult && (
                            <>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Τελευταία βαθμολογία</span>
                                <span className={`font-bold ${passed ? "text-green-600" : "text-red-600"}`}>
                                  {Math.round(score)}%
                                </span>
                              </div>
                              <Progress value={score} />
                            </>
                          )}
                          <div className="flex gap-2 mt-1">
                            <Link href={`/training/${mod.id}`} className="flex-1">
                              <Button
                                variant={lastResult && !passed ? "default" : "outline"}
                                size="sm"
                                className="w-full"
                              >
                                {!lastResult ? "Έναρξη Εκπαίδευσης" : passed ? "Επανάληψη" : "Επανεκπαίδευση"}
                              </Button>
                            </Link>
                            {isAdmin && (
                              <TrainingInviteButton
                                moduleId={mod.id}
                                moduleTitle={mod.title}
                                moduleDescription={mod.description}
                                departments={departments}
                                users={users}
                              />
                            )}
                          </div>
                          {!passed && lastResult && (
                            <div className="flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 dark:bg-orange-950/20 rounded-md p-2">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              Απαιτείται επανεκπαίδευση για συμμόρφωση
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* History */}
            {myResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ιστορικό Εξετάσεων</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="pb-2 pr-4">Ενότητα</th>
                        <th className="pb-2 pr-4">Βαθμολογία</th>
                        <th className="pb-2 pr-4">Αποτέλεσμα</th>
                        <th className="pb-2">Ημ/νία</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {myResults.slice(0, 10).map((r) => (
                        <tr key={r.id}>
                          <td className="py-2.5 pr-4 font-medium">{r.module.title}</td>
                          <td className="py-2.5 pr-4">{Math.round(r.score)}%</td>
                          <td className="py-2.5 pr-4">
                            {r.passed ? (
                              <Badge variant="success">Επιτυχία</Badge>
                            ) : (
                              <Badge variant="destructive">Αποτυχία</Badge>
                            )}
                          </td>
                          <td className="py-2.5 text-muted-foreground text-xs">{formatDate(r.completedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <LegalSidebar
            title="Εκπαίδευση & GDPR"
            summary="Η εκπαίδευση προσωπικού σε θέματα GDPR είναι υποχρεωτική βάσει Άρθρου 39 και αποτελεί μέρος της οργανωτικής συμμόρφωσης."
            articles={[
              { number: "39", title: "Καθήκοντα DPO", summary: "Ο DPO εκπαιδεύει το προσωπικό και ελέγχει τη συμμόρφωση." },
              { number: "24", title: "Ευθύνη Υπεύθυνου Επεξεργασίας", summary: "Υποχρέωση εφαρμογής κατάλληλων πολιτικών, συμπεριλαμβανομένης εκπαίδευσης." },
              { number: "5(2)", title: "Λογοδοσία", summary: "Τεκμηρίωση εκπαίδευσης ως απόδειξη συμμόρφωσης." },
            ]}
            tips={[
              "Επαναλαμβάνετε εκπαίδευση ετησίως ή μετά παραβίασης",
              "Τηρείτε αρχείο εκπαίδευσης για κάθε εργαζόμενο",
              "Αποτυχία = υποχρεωτική επανεκπαίδευση σε 30 ημέρες",
            ]}
          />
        </div>
      </main>
    </div>
  );
}
