import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { LegalSidebar } from "@/components/shared/legal-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErasureStatusUpdater } from "@/components/modules/erasure-status-updater";
import { ErasureCreateButton } from "@/components/modules/erasure-create-modal";
import { UserX, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

const statusConfig = {
  PENDING: { label: "Εκκρεμεί", variant: "warning" as const, icon: Clock },
  IN_PROGRESS: { label: "Σε Εξέλιξη", variant: "default" as const, icon: AlertTriangle },
  COMPLETED: { label: "Ολοκληρώθηκε", variant: "success" as const, icon: CheckCircle2 },
  REJECTED: { label: "Απορρίφθηκε", variant: "destructive" as const, icon: XCircle },
  PARTIAL: { label: "Μερική Διαγραφή", variant: "warning" as const, icon: AlertTriangle },
};

export default async function ErasurePage() {
  const session = await auth();

  const requests = await prisma.erasureRequest.findMany({
    orderBy: { requestDate: "desc" },
  });

  const counts = {
    pending: requests.filter((r) => r.status === "PENDING").length,
    inProgress: requests.filter((r) => r.status === "IN_PROGRESS").length,
    completed: requests.filter((r) => r.status === "COMPLETED").length,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        userName={session?.user?.name}
        userRole={(session?.user as any)?.role}
        pageTitle="Δικαίωμα Λήθης — Αιτήματα Διαγραφής"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-6">
          <div className="flex-1 space-y-6">

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Εκκρεμή", count: counts.pending, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800" },
                { label: "Σε Εξέλιξη", count: counts.inProgress, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800" },
                { label: "Ολοκληρωμένα", count: counts.completed, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" },
              ].map((s) => (
                <div key={s.label} className={`rounded-xl border p-4 text-center ${s.bg}`}>
                  <p className={`text-3xl font-bold ${s.color}`}>{s.count}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Requests list */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <UserX className="h-5 w-5 text-primary" />
                    Αιτήματα Διαγραφής ({requests.length})
                  </span>
                  <ErasureCreateButton />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {requests.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    Δεν υπάρχουν αιτήματα διαγραφής ακόμη
                  </p>
                ) : (
                  <div className="space-y-3">
                    {requests.map((req) => {
                      const cfg = statusConfig[req.status];
                      const daysSince = Math.floor(
                        (Date.now() - new Date(req.requestDate).getTime()) / 86400000
                      );
                      const isOverdue = req.status === "PENDING" && daysSince > 25;
                      const systems = req.systems as string[];

                      return (
                        <div
                          key={req.id}
                          className={`rounded-xl border p-4 space-y-3 ${
                            isOverdue ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/20" : "border-border"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold">{req.subjectName}</p>
                                <Badge variant={cfg.variant} className="gap-1">
                                  <cfg.icon className="h-3 w-3" />
                                  {cfg.label}
                                </Badge>
                                {isOverdue && (
                                  <Badge variant="destructive" className="text-xs">
                                    ⚠ Προθεσμία {30 - daysSince} ημέρες
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-0.5">{req.subjectEmail}</p>
                              {req.subjectPhone && (
                                <p className="text-xs text-muted-foreground">{req.subjectPhone}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0 text-xs text-muted-foreground">
                              <p>Αίτηση: {formatDate(req.requestDate)}</p>
                              <p className="mt-0.5">{daysSince} ημέρες</p>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground line-clamp-2">{req.description}</p>

                          {systems.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap">
                              <span className="text-xs text-muted-foreground">Συστήματα:</span>
                              {systems.map((s) => (
                                <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                              ))}
                            </div>
                          )}

                          {req.completedAt && (
                            <p className="text-xs text-green-600 dark:text-green-400">
                              ✓ Ολοκληρώθηκε: {formatDateTime(req.completedAt)}
                            </p>
                          )}

                          <ErasureStatusUpdater
                            id={req.id}
                            currentStatus={req.status}
                            notes={req.notes ?? ""}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Export button */}
            <div className="flex justify-end">
              <a href="/api/export/erasure" download>
                <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-colors">
                  📥 Εξαγωγή Excel
                </button>
              </a>
            </div>
          </div>

          <LegalSidebar
            title="Δικαίωμα Λήθης"
            summary="Τα υποκείμενα έχουν δικαίωμα να ζητήσουν διαγραφή δεδομένων τους. Η απάντηση πρέπει να δοθεί εντός 30 ημερών."
            articles={[
              { number: "17", title: "Δικαίωμα διαγραφής", summary: "Το υποκείμενο έχει δικαίωμα διαγραφής δεδομένων όταν δεν είναι πλέον απαραίτητα ή ανακαλεί συγκατάθεση." },
              { number: "12", title: "Διαφανής ενημέρωση", summary: "Απάντηση εντός 1 μηνός. Δυνατή παράταση 2 μηνών για σύνθετα αιτήματα (με ενημέρωση)." },
              { number: "17(3)", title: "Εξαιρέσεις", summary: "Δεν ισχύει για: νομικές υποχρεώσεις, δημόσιο συμφέρον, υπεράσπιση αξιώσεων." },
            ]}
            tips={[
              "Προθεσμία απάντησης: 30 ημερολογιακές ημέρες",
              "Τεκμηριώστε κάθε αίτημα (λήψη, επαλήθευση, αποτέλεσμα)",
              "Αν αρνηθείτε, εξηγήστε τη νομική βάση άρνησης",
              "Διαγραφή = και από backups (μετά το επόμενο backup cycle)",
            ]}
          />
        </div>
      </main>
    </div>
  );
}
