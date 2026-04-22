import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  FileText,
  Download,
  ArrowLeft,
  User,
  Calendar,
  Layers,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Προσχέδιο",
  IN_REVIEW: "Υπό Αξιολόγηση",
  APPROVED: "Εγκεκριμένο",
  REQUIRES_CONSULTATION: "Απαιτείται Διαβούλευση",
};

const STATUS_VARIANT: Record<string, "success" | "secondary" | "destructive" | "warning"> = {
  DRAFT: "secondary",
  IN_REVIEW: "warning",
  APPROVED: "success",
  REQUIRES_CONSULTATION: "destructive",
};

export default async function DpiaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const report = await prisma.dpiaReport.findUnique({
    where: { id },
    include: {
      project: { select: { name: true, description: true, riskLevel: true } },
      user: { select: { name: true, email: true } },
    },
  });

  if (!report) notFound();

  const risks = (report.risksIdentified as string[]) ?? [];
  const mitigations = (report.riskMitigation as string[]) ?? [];
  const maxItems = Math.max(risks.length, mitigations.length);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        userName={session?.user?.name}
        userRole={(session?.user as any)?.role}
        pageTitle={report.title}
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Back + header */}
          <div className="flex items-center justify-between gap-4">
            <Link href="/dpia" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Πίσω στη λίστα
            </Link>
            <a href={`/api/export/dpia?id=${report.id}`} download>
              <button
                className="flex items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium text-white transition-colors"
                style={{ background: "#0078d4" }}
              >
                <Download className="h-4 w-4" /> Εξαγωγή Word
              </button>
            </a>
          </div>

          {/* Title card */}
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg mt-0.5"
                    style={{ background: "rgba(0,120,212,0.1)" }}
                  >
                    <FileText className="h-5 w-5" style={{ color: "#0078d4" }} />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold leading-tight">{report.title}</h1>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5" /> {report.project.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" /> {report.user.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" /> {formatDate(report.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                <Badge variant={STATUS_VARIANT[report.status] ?? "secondary"}>
                  {STATUS_LABELS[report.status] ?? report.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Processing purpose */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Σκοπός & Περιγραφή Επεξεργασίας
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {report.processingPurpose}
              </p>
            </CardContent>
          </Card>

          {/* Risk assessment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Εκτίμηση Κινδύνου
              </CardTitle>
            </CardHeader>
            <CardContent>
              {risks.length === 0 && mitigations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Δεν έχουν καταχωρηθεί κίνδυνοι.</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-border">
                  {/* Table header */}
                  <div className="grid grid-cols-2">
                    <div
                      className="px-4 py-2.5 text-xs font-semibold"
                      style={{ background: "rgba(202,80,16,0.08)", color: "#ca5010", borderRight: "1px solid rgb(var(--border))" }}
                    >
                      Κίνδυνοι ({risks.length})
                    </div>
                    <div
                      className="px-4 py-2.5 text-xs font-semibold"
                      style={{ background: "rgba(16,124,16,0.08)", color: "#107c10" }}
                    >
                      Μέτρα Αντιμετώπισης ({mitigations.length})
                    </div>
                  </div>
                  {/* Rows */}
                  {Array.from({ length: maxItems }).map((_, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-2 border-t border-border"
                    >
                      <div className="px-4 py-3 text-sm" style={{ borderRight: "1px solid rgb(var(--border))" }}>
                        {risks[i] ? (
                          <span className="flex items-start gap-2">
                            <span className="mt-0.5 text-orange-500 shrink-0">▸</span>
                            {risks[i]}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </div>
                      <div className="px-4 py-3 text-sm">
                        {mitigations[i] ? (
                          <span className="flex items-start gap-2">
                            <span className="mt-0.5 text-green-600 shrink-0">✓</span>
                            {mitigations[i]}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {risks.length > mitigations.length && (
                <div
                  className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
                  style={{ background: "rgba(202,80,16,0.08)", color: "#ca5010", border: "1px solid rgba(202,80,16,0.2)" }}
                >
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {risks.length - mitigations.length} κίνδυνοι χωρίς αντίστοιχο μέτρο αντιμετώπισης
                </div>
              )}
            </CardContent>
          </Card>

          {/* Necessity & DPO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Αναγκαιότητα & Αναλογικότητα
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  {report.necessityAssessed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-orange-500 shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {report.necessityAssessed ? "Αξιολογήθηκε" : "Εκκρεμεί"}
                    </p>
                    <p className="text-xs text-muted-foreground">Άρθρο 35 §7(b) GDPR</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Υπεύθυνος Προστασίας Δεδομένων (ΥΠΔ)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  {report.dpoConsulted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {report.dpoConsulted
                        ? report.dpoName
                          ? report.dpoName
                          : "Διαβουλεύτηκε"
                        : "Εκκρεμεί διαβούλευση"}
                    </p>
                    <p className="text-xs text-muted-foreground">Άρθρο 35 §2 GDPR</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Supervisory body */}
          {report.supervisoryBody && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Εποπτική Αρχή</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{report.supervisoryBody}</p>
              </CardContent>
            </Card>
          )}

          {/* GDPR compliance checklist */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Επισκόπηση Συμμόρφωσης GDPR Άρθρο 35
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { label: "Σκοπός επεξεργασίας καθορίστηκε", ok: !!report.processingPurpose },
                  { label: "Κίνδυνοι αναγνωρίστηκαν", ok: risks.length > 0 },
                  { label: "Μέτρα μείωσης κινδύνου", ok: mitigations.length > 0 },
                  { label: "Κάθε κίνδυνος καλύπτεται από μέτρο", ok: mitigations.length >= risks.length && risks.length > 0 },
                  { label: "Αξιολόγηση αναγκαιότητας", ok: report.necessityAssessed },
                  { label: "Διαβούλευση με ΥΠΔ", ok: report.dpoConsulted },
                ].map(({ label, ok }) => (
                  <div key={label} className="flex items-center gap-2.5 text-sm">
                    {ok ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-orange-400 shrink-0" />
                    )}
                    <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
