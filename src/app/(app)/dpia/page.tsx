import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { LegalSidebar } from "@/components/shared/legal-sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DpiaPageActions, DpaPageActions, DpaWordExportButton } from "@/components/modules/dpia-page-actions";
import { CheckCircle2, Clock, AlertTriangle, FileText, Download } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

const dpiaStatusLabels: Record<string, string> = {
  DRAFT: "Προσχέδιο",
  IN_REVIEW: "Υπό Αξιολόγηση",
  APPROVED: "Εγκεκριμένο",
  REQUIRES_CONSULTATION: "Απαιτείται Διαβούλευση",
};

const dpaStatusLabels: Record<string, string> = {
  PENDING: "Εκκρεμεί",
  SIGNED: "Υπογεγραμμένη",
  EXPIRED: "Ληγμένη",
  TERMINATED: "Τερματισμένη",
};

export default async function DpiaPage() {
  const session = await auth();

  const [dpiaReports, dpaContracts, projects] = await Promise.all([
    prisma.dpiaReport.findMany({
      orderBy: { createdAt: "desc" },
      include: { project: { select: { name: true } }, user: { select: { name: true } } },
    }),
    prisma.dpaContract.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, title: true, processorName: true, controllerName: true,
        status: true, signedAt: true, pdfUrl: true,
        project: { select: { name: true } },
      },
    }),
    prisma.project.findMany({ select: { id: true, name: true, description: true }, where: { status: "ACTIVE" } }),
  ]);

  const projectsData = projects.map((p) => ({ id: p.id, name: p.name, description: p.description }));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        userName={session?.user?.name}
        userRole={(session?.user as any)?.role}
        pageTitle="DPIA & Συμβάσεις DPA"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-6">
          <div className="flex-1 space-y-6 min-w-0">

            {/* DPIA section */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Εκτιμήσεις Αντικτύπου (DPIA)
              </h2>
              <DpiaPageActions projects={projectsData} />
            </div>

            {dpiaReports.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground text-sm">
                  Δεν υπάρχουν DPIA. Δημιουργήστε μία για έργα υψηλού κινδύνου.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {dpiaReports.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5">
                        {d.status === "APPROVED" ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : d.status === "REQUIRES_CONSULTATION" ? (
                          <AlertTriangle className="h-5 w-5 text-orange-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{d.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.project.name} · {d.user.name} · {formatDate(d.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={d.status === "APPROVED" ? "success" : d.status === "REQUIRES_CONSULTATION" ? "destructive" : "secondary"}>
                        {dpiaStatusLabels[d.status]}
                      </Badge>
                      <Link href={`/dpia/${d.id}`}>
                        <Button variant="outline" size="sm">Προβολή</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* DPA Contracts section */}
            <div className="flex items-center justify-between pt-2">
              <h2 className="text-xl font-bold">Συμβάσεις DPA (Άρθρο 28)</h2>
              <DpaPageActions projects={projectsData} />
            </div>

            {dpaContracts.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center text-muted-foreground text-sm">
                  Δεν υπάρχουν συμβάσεις DPA ακόμη.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {dpaContracts.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.processorName} → {c.controllerName} · {c.project.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={c.status === "SIGNED" ? "success" : c.status === "EXPIRED" ? "destructive" : "warning"}>
                        {dpaStatusLabels[c.status]}
                      </Badge>
                      {c.signedAt && <span className="text-xs text-muted-foreground">{formatDate(c.signedAt)}</span>}
                      {(c as any).pdfUrl ? (
                        <a href={(c as any).pdfUrl} target="_blank" rel="noreferrer" download>
                          <Button variant="outline" size="sm" className="gap-1.5">
                            <FileText className="h-3.5 w-3.5" /> Word
                          </Button>
                        </a>
                      ) : (
                        <DpaWordExportButton contractId={c.id} />
                      )}
                      <Link href={`/dpa/${c.id}`}>
                        <Button variant="outline" size="sm">Προβολή</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <LegalSidebar
            title="DPIA & DPA"
            summary="Η DPIA είναι υποχρεωτική για επεξεργασίες υψηλού κινδύνου. Κάθε τρίτος πάροχος απαιτεί DPA βάσει Άρθρου 28."
            articles={[
              { number: "35", title: "Εκτίμηση Αντικτύπου (DPIA)", summary: "Υποχρεωτική πριν επεξεργασία που ενδέχεται να παρουσιάσει υψηλό κίνδυνο για τα δικαιώματα φυσικών προσώπων." },
              { number: "28", title: "Εκτελεστής Επεξεργασίας", summary: "Η επεξεργασία από τρίτο απαιτεί γραπτή σύμβαση που ορίζει αντικείμενο, διάρκεια, φύση και σκοπό." },
              { number: "36", title: "Προηγούμενη Διαβούλευση", summary: "Αν DPIA εμφανίσει υψηλό κίνδυνο, υποχρεωτική διαβούλευση με εποπτική αρχή." },
            ]}
            tips={[
              "DPIA απαιτείται για: παρακολούθηση, ειδικές κατηγορίες, μαζική επεξεργασία",
              "Ενημερώνετε DPIA όταν αλλάζει η φύση επεξεργασίας",
              "DPA υποχρεωτική με cloud providers, SaaS, υπεργολάβους",
            ]}
          />
        </div>
      </main>
    </div>
  );
}
