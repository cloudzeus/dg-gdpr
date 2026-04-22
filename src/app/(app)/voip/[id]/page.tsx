import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { LegalSidebar } from "@/components/shared/legal-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VoipDpiaButton } from "@/components/modules/voip-dpia-button";
import {
  Phone, Mic, Clock, Shield, CheckCircle2, AlertTriangle,
  FileText, Lock, Bell, ChevronLeft,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

const legalBasisLabels: Record<string, string> = {
  CONSENT: "Συγκατάθεση (Άρθρο 6(1)(a))",
  CONTRACTUAL_NECESSITY: "Εκτέλεση Σύμβασης (Άρθρο 6(1)(b))",
  LEGITIMATE_INTEREST: "Έννομο Συμφέρον (Άρθρο 6(1)(f))",
  LEGAL_OBLIGATION: "Νομική Υποχρέωση (Άρθρο 6(1)(c))",
};

export default async function VoipDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;

  const [cfg, projects] = await Promise.all([
    prisma.voIPConfig.findUnique({
      where: { id },
      include: {
        callLogs: { orderBy: { createdAt: "desc" }, take: 20 },
        providerDpas: { select: { id: true, status: true, signedAt: true } },
      },
    }),
    prisma.project.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, description: true },
    }),
  ]);

  if (!cfg) notFound();

  const dpaSigned = cfg.providerDpas.some((d) => d.status === "SIGNED");
  const dpaCount = cfg.providerDpas.length;

  // Pre-fill DPIA with VoIP context
  const prefillTitle = `DPIA Ηχογράφηση VoIP — ${cfg.providerName}`;
  const legalBasisText = cfg.legalBasis ? legalBasisLabels[cfg.legalBasis] : "Μη ορισμένη";
  const prefillPurpose = `Επεξεργασία ηχητικών δεδομένων κλήσεων μέσω παρόχου VoIP ${cfg.providerName}. Νομική βάση: ${legalBasisText}. Διατήρηση εγγραφών: ${cfg.retentionDays} ημέρες. Κρυπτογράφηση: ${cfg.encryptionEnabled ? "Ναι" : "Όχι"}. Ειδοποίηση καλούντων: ${cfg.notifyCallers ? "Ναι" : "Όχι"}.`;
  const prefillDataObjects = [
    "Φωνητικές εγγραφές κλήσεων",
    "Μεταδεδομένα κλήσεων (αριθμός, ώρα, διάρκεια)",
    "Στοιχεία καλούντος/καλούμενου",
  ];
  const prefillRisks = [
    "Μη εξουσιοδοτημένη πρόσβαση σε ηχητικές εγγραφές",
    "Παραβίαση δεδομένων από τρίτους (πάροχος VoIP)",
    "Διατήρηση δεδομένων πέραν του αναγκαίου",
    "Μη νόμιμη επεξεργασία χωρίς νόμιμη βάση",
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        userName={session?.user?.name}
        userRole={(session?.user as any)?.role}
        pageTitle={`VoIP — ${cfg.providerName}`}
      />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 space-y-6 min-w-0">

            {/* Back + header */}
            <div className="flex items-center gap-3">
              <Link href="/voip">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <ChevronLeft className="h-4 w-4" /> Επιστροφή
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{cfg.providerName}</h2>
                  {cfg.sipServer && <p className="text-xs text-muted-foreground">{cfg.sipServer}</p>}
                </div>
              </div>
            </div>

            {/* DPIA pending alert */}
            <div className="rounded-xl border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 p-4 flex flex-wrap items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-orange-700 dark:text-orange-400">Εκκρεμεί DPIA για Ηχογράφηση VoIP</p>
                <p className="text-sm text-orange-600 dark:text-orange-500 mt-0.5">
                  Η επεξεργασία ηχητικών δεδομένων κλήσεων απαιτεί Εκτίμηση Αντικτύπου (Άρθρο 35 GDPR).
                  Τα δεδομένα του παρόχου έχουν προ-συμπληρωθεί.
                </p>
              </div>
              <VoipDpiaButton
                projects={projects}
                prefillTitle={prefillTitle}
                prefillPurpose={prefillPurpose}
                prefillDataObjects={prefillDataObjects}
                prefillRisks={prefillRisks}
              />
            </div>

            {/* Config details */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Διαμόρφωση Ηχογράφησης</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Row icon={<Mic className="h-4 w-4" />} label="Ηχογράφηση">
                    {cfg.recordingEnabled
                      ? <Badge variant="warning">Ενεργή</Badge>
                      : <Badge variant="secondary">Ανενεργή</Badge>}
                  </Row>
                  <Row icon={<Lock className="h-4 w-4" />} label="Κρυπτογράφηση">
                    {cfg.encryptionEnabled
                      ? <span className="text-green-600 font-medium">Ναι</span>
                      : <span className="text-red-500 font-medium">Όχι</span>}
                  </Row>
                  <Row icon={<Clock className="h-4 w-4" />} label="Διατήρηση εγγραφών">
                    <span>{cfg.retentionDays} ημέρες</span>
                  </Row>
                  <Row icon={<Clock className="h-4 w-4" />} label="Διατήρηση μεταδεδομένων">
                    <span>{cfg.metadataRetainDays} ημέρες</span>
                  </Row>
                  <Row icon={<Bell className="h-4 w-4" />} label="Ειδοποίηση καλούντων">
                    {cfg.notifyCallers
                      ? <span className="text-green-600 font-medium">Ναι</span>
                      : <span className="text-red-500 font-medium">Όχι</span>}
                  </Row>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Νομική Βάση & DPA</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Row icon={<Shield className="h-4 w-4" />} label="Νομική Βάση">
                    <span className="font-medium text-primary text-xs">
                      {cfg.legalBasis ? legalBasisLabels[cfg.legalBasis] : <span className="text-destructive">Μη ορισμένη</span>}
                    </span>
                  </Row>
                  {cfg.consentMechanism && (
                    <Row icon={<FileText className="h-4 w-4" />} label="Μηχανισμός Συγκατάθεσης">
                      <span className="text-muted-foreground">{cfg.consentMechanism}</span>
                    </Row>
                  )}
                  <Row icon={<FileText className="h-4 w-4" />} label="Συμβάσεις DPA παρόχου">
                    <span>{dpaCount} σύμβαση/ες</span>
                  </Row>
                  <Row icon={<CheckCircle2 className="h-4 w-4" />} label="DPA Κατάσταση">
                    {dpaSigned
                      ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-500 inline mr-1" /><span className="text-green-600">Υπογεγραμμένη</span></>
                      : <><AlertTriangle className="h-3.5 w-3.5 text-orange-500 inline mr-1" /><span className="text-orange-600">Εκκρεμεί</span></>}
                  </Row>
                  <Row icon={<Clock className="h-4 w-4" />} label="Δημιουργία">
                    <span className="text-muted-foreground">{formatDate(cfg.createdAt)}</span>
                  </Row>
                </CardContent>
              </Card>
            </div>

            {/* Call logs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Πρόσφατες Κλήσεις ({cfg.callLogs.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {cfg.callLogs.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">Δεν υπάρχουν καταγεγραμμένες κλήσεις</p>
                ) : (
                  <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/40 text-xs uppercase text-muted-foreground">
                        <th className="px-4 py-2 text-left font-semibold">Καλών</th>
                        <th className="px-4 py-2 text-left font-semibold">Καλούμενος</th>
                        <th className="px-4 py-2 text-center font-semibold">Διάρκεια</th>
                        <th className="px-4 py-2 text-center font-semibold">Κατεύθυνση</th>
                        <th className="px-4 py-2 text-center font-semibold">Ηχογράφηση</th>
                        <th className="px-4 py-2 text-right font-semibold">Ημερομηνία</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cfg.callLogs.map((log) => (
                        <tr key={log.id} className="border-b border-border hover:bg-secondary/30">
                          <td className="px-4 py-2.5 font-medium">{log.callerId ?? "—"}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{log.calledNumber ?? "—"}</td>
                          <td className="px-4 py-2.5 text-center text-muted-foreground">
                            {`${Math.floor(log.duration / 60)}:${String(log.duration % 60).padStart(2, "0")}`}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <Badge variant="secondary" className="text-[10px]">
                              {log.direction === "INBOUND" ? "Εισερχόμενη" : "Εξερχόμενη"}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {log.recorded
                              ? <Badge variant="warning" className="text-[10px]">Ναι</Badge>
                              : <Badge variant="secondary" className="text-[10px]">Όχι</Badge>}
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                            {formatDate(log.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <LegalSidebar
            title="VoIP & DPIA"
            summary="Η ηχογράφηση κλήσεων απαιτεί DPIA όταν επεξεργάζεται δεδομένα σε μεγάλη κλίμακα ή περιλαμβάνει ευαίσθητα δεδομένα."
            articles={[
              { number: "35", title: "Εκτίμηση Αντικτύπου", summary: "Υποχρεωτική DPIA για συστηματική παρακολούθηση και επεξεργασία δεδομένων επικοινωνίας." },
              { number: "6", title: "Νόμιμη επεξεργασία", summary: "Κάθε ηχογράφηση απαιτεί μια από τις 6 νόμιμες βάσεις του Άρθρου 6." },
              { number: "28", title: "Εκτελεστής επεξεργασίας", summary: "Σύμβαση DPA υποχρεωτική με κάθε πάροχο VoIP που επεξεργάζεται δεδομένα." },
              { number: "13", title: "Ενημέρωση υποκειμένων", summary: "Οι καλούντες πρέπει να ενημερώνονται πριν ή κατά τη σύνδεση." },
            ]}
            tips={[
              "Ηχητική ειδοποίηση: 'Η κλήση ηχογραφείται...'",
              "Max 90 ημέρες για εμπορικές εγγραφές",
              "Κρυπτογράφηση AES για αρχεία εγγραφών",
              "DPA υποχρεωτική με κάθε τρίτο πάροχο VoIP",
            ]}
          />
        </div>
      </main>
    </div>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-right">{children}</div>
    </div>
  );
}
