import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { LegalSidebar } from "@/components/shared/legal-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { Code2, Plus, ShieldCheck, Database, Lock } from "lucide-react";
import { formatDate, riskLevelLabel } from "@/lib/utils";

export default async function DevPage() {
  const session = await auth();

  const [projects, checklists, dbLogs] = await Promise.all([
    prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: { devChecklists: { select: { score: true } } },
    }),
    prisma.devChecklist.count(),
    prisma.dbAccessLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true } },
        project: { select: { name: true } },
      },
    }),
  ]);

  const riskColors = {
    LOW: "success" as const,
    MEDIUM: "warning" as const,
    HIGH: "destructive" as const,
    CRITICAL: "destructive" as const,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar userName={session?.user?.name} userRole={(session?.user as any)?.role} pageTitle="Ανάπτυξη Λογισμικού — Συμμόρφωση" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-6">
          {/* Main content */}
          <div className="flex-1 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Code2 className="h-5 w-5 text-primary" /> Έργα Ανάπτυξης
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Διαχείριση Privacy by Design και πρόσβασης σε ΒΔ πελατών
                </p>
              </div>
              <Link href="/dev/projects/new">
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" /> Νέο Έργο
                </Button>
              </Link>
            </div>

            {/* Projects grid */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground col-span-full text-center py-12">
                  Δεν υπάρχουν έργα ακόμη. Δημιουργήστε το πρώτο.
                </p>
              ) : (
                projects.map((p) => {
                  const avgScore = p.devChecklists.length
                    ? p.devChecklists.reduce((a, c) => a + c.score, 0) / p.devChecklists.length
                    : 0;
                  return (
                    <Link key={p.id} href={`/dev/projects/${p.id}`}>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base line-clamp-1">{p.name}</CardTitle>
                            <Badge variant={riskColors[p.riskLevel]}>{riskLevelLabel(p.riskLevel)}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{p.clientName}</p>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Privacy Score</span>
                            <span className="font-semibold">{Math.round(avgScore)}%</span>
                          </div>
                          <Progress value={avgScore} />
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{p.devChecklists.length} έλεγχοι</span>
                            <span>{formatDate(p.createdAt)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })
              )}
            </div>

            {/* DB Access Log */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" /> Αρχείο Πρόσβασης σε Βάσεις Δεδομένων
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dbLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Δεν υπάρχουν εγγραφές πρόσβασης</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground">
                          <th className="pb-2 pr-4">Προγραμματιστής</th>
                          <th className="pb-2 pr-4">Έργο</th>
                          <th className="pb-2 pr-4">ΒΔ Πελάτη</th>
                          <th className="pb-2 pr-4">Τύπος</th>
                          <th className="pb-2 pr-4">Λόγος</th>
                          <th className="pb-2">Ημ/νία</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {dbLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-secondary/30">
                            <td className="py-2.5 pr-4 font-medium">{log.developerName}</td>
                            <td className="py-2.5 pr-4 text-muted-foreground">{log.project.name}</td>
                            <td className="py-2.5 pr-4">
                              <Badge variant="secondary">{log.dbType}</Badge>
                            </td>
                            <td className="py-2.5 pr-4">
                              <Badge variant={log.accessType === "DELETE" ? "destructive" : "default"}>
                                {log.accessType}
                              </Badge>
                            </td>
                            <td className="py-2.5 pr-4 max-w-48 truncate text-muted-foreground">{log.accessReason}</td>
                            <td className="py-2.5 text-muted-foreground text-xs">{formatDate(log.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="mt-4">
                  <Link href="/dev/db-access/new">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Lock className="h-4 w-4" /> Καταγραφή Νέας Πρόσβασης
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Legal sidebar */}
          <LegalSidebar
            title="Ανάπτυξη & GDPR"
            summary="Κάθε εφαρμογή που επεξεργάζεται προσωπικά δεδομένα πρέπει να σχεδιάζεται με αρχή Privacy by Design. Η καταγραφή πρόσβασης σε παραγωγικές ΒΔ είναι υποχρεωτική."
            articles={[
              { number: "25", title: "Προστασία δεδομένων από τον σχεδιασμό", summary: "Ο υπεύθυνος επεξεργασίας εφαρμόζει κατάλληλα τεχνικά μέτρα κατά τον σχεδιασμό και εξ ορισμού." },
              { number: "32", title: "Ασφάλεια επεξεργασίας", summary: "Εφαρμογή κατάλληλων τεχνικών και οργανωτικών μέτρων για την ασφάλεια των δεδομένων." },
              { number: "30", title: "Αρχεία δραστηριοτήτων επεξεργασίας", summary: "Υποχρέωση τήρησης αρχείου όλων των δραστηριοτήτων επεξεργασίας." },
            ]}
            tips={[
              "Χρησιμοποιείτε κρυπτογράφηση AES-256 για δεδομένα ανάπαυσης",
              "Εφαρμόζετε αρχή ελάχιστης πρόσβασης (least privilege)",
              "Καταγράφετε κάθε πρόσβαση σε παραγωγικές ΒΔ",
              "Εκτελείτε code review με έμφαση στην ασφάλεια",
            ]}
          />
        </div>
      </main>
    </div>
  );
}
