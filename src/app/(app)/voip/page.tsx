import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { LegalSidebar } from "@/components/shared/legal-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { createVoIPConfig } from "@/actions/voip";
import { Phone, Mic, Clock, Shield, Plus, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

const legalBasisLabels: Record<string, string> = {
  CONSENT: "Συγκατάθεση (Άρθρο 6(1)(a))",
  CONTRACTUAL_NECESSITY: "Εκτέλεση Σύμβασης (Άρθρο 6(1)(b))",
  LEGITIMATE_INTEREST: "Έννομο Συμφέρον (Άρθρο 6(1)(f))",
  LEGAL_OBLIGATION: "Νομική Υποχρέωση (Άρθρο 6(1)(c))",
};

export default async function VoIPPage() {
  const session = await auth();
  const configs = await prisma.voIPConfig.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      callLogs: { select: { id: true } },
      providerDpas: { select: { status: true } },
    },
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar userName={session?.user?.name} userRole={(session?.user as any)?.role} pageTitle="VoIP & Τηλεφωνία" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-6">
          <div className="flex-1 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" /> Διαχείριση VoIP & Ηχογραφήσεων
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">Νομική βάση, διατήρηση δεδομένων και συμβάσεις παρόχων</p>
              </div>
              <Link href="/voip/new">
                <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Νέα Διαμόρφωση VoIP</Button>
              </Link>
            </div>

            {/* VoIP Configs */}
            {configs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 space-y-3 text-center">
                  <Phone className="h-12 w-12 text-muted-foreground/30" />
                  <p className="font-medium">Δεν υπάρχουν διαμορφώσεις VoIP</p>
                  <p className="text-sm text-muted-foreground">Προσθέστε τον πάροχο VoIP σας και διαχειριστείτε τη συμμόρφωση ηχογραφήσεων</p>
                  <Link href="/voip/new"><Button>Προσθήκη Παρόχου VoIP</Button></Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {configs.map((cfg) => {
                  const dpaSigned = cfg.providerDpas.some((d) => d.status === "SIGNED");
                  return (
                    <Card key={cfg.id} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{cfg.providerName}</CardTitle>
                            {cfg.sipServer && <p className="text-xs text-muted-foreground mt-0.5">{cfg.sipServer}</p>}
                          </div>
                          <div className="flex gap-1.5">
                            {cfg.recordingEnabled ? (
                              <Badge variant="warning" className="gap-1"><Mic className="h-3 w-3" /> Ηχογράφηση ΟΝ</Badge>
                            ) : (
                              <Badge variant="secondary">Χωρίς Ηχογράφηση</Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Shield className={`h-4 w-4 ${cfg.encryptionEnabled ? "text-green-500" : "text-red-400"}`} />
                            <span className="text-muted-foreground">Κρυπτογράφηση:</span>
                            <span className="font-medium">{cfg.encryptionEnabled ? "Ναι" : "Όχι"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Διατήρηση:</span>
                            <span className="font-medium">{cfg.retentionDays} ημ.</span>
                          </div>
                        </div>
                        {cfg.legalBasis && (
                          <div className="rounded-md bg-primary/5 border border-primary/10 p-2.5 text-xs">
                            <span className="font-semibold text-primary">Νομική Βάση: </span>
                            {legalBasisLabels[cfg.legalBasis] ?? cfg.legalBasis}
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
                          <span>{cfg.callLogs.length} κλήσεις</span>
                          <div className="flex items-center gap-1.5">
                            {dpaSigned ? (
                              <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /><span className="text-green-600">DPA Υπογεγραμμένη</span></>
                            ) : (
                              <><AlertTriangle className="h-3.5 w-3.5 text-orange-500" /><span className="text-orange-600">DPA Εκκρεμεί</span></>
                            )}
                          </div>
                        </div>
                        <Link href={`/voip/${cfg.id}`}>
                          <Button variant="outline" size="sm" className="w-full mt-1">Λεπτομέρειες & Επεξεργασία</Button>
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Quick add form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Γρήγορη Προσθήκη Παρόχου VoIP</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={createVoIPConfig} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Όνομα Παρόχου *</label>
                      <Input name="providerName" placeholder="π.χ. 3CX, Asterisk, Twilio" required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">SIP Server</label>
                      <Input name="sipServer" placeholder="π.χ. sip.provider.gr:5060" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Διάρκεια Διατήρησης (ημέρες)</label>
                      <Input name="retentionDays" type="number" defaultValue="90" min="1" max="3650" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Διατήρηση Μεταδεδομένων (ημέρες)</label>
                      <Input name="metadataRetainDays" type="number" defaultValue="365" min="1" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Νομική Βάση Ηχογράφησης</label>
                    <Select name="legalBasis">
                      <option value="">Επιλέξτε...</option>
                      <option value="CONSENT">Συγκατάθεση</option>
                      <option value="CONTRACTUAL_NECESSITY">Εκτέλεση Σύμβασης</option>
                      <option value="LEGITIMATE_INTEREST">Έννομο Συμφέρον</option>
                      <option value="LEGAL_OBLIGATION">Νομική Υποχρέωση</option>
                    </Select>
                  </div>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" name="recordingEnabled" className="h-4 w-4 rounded accent-primary" />
                      Ηχογράφηση κλήσεων ενεργή
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" name="encryptionEnabled" defaultChecked className="h-4 w-4 rounded accent-primary" />
                      Κρυπτογράφηση εγγραφών
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" name="notifyCallers" defaultChecked className="h-4 w-4 rounded accent-primary" />
                      Ειδοποίηση καλούντων
                    </label>
                  </div>
                  <Button type="submit">Αποθήκευση Παρόχου VoIP</Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <LegalSidebar
            title="VoIP & Ηχογράφηση"
            summary="Η ηχογράφηση κλήσεων θεωρείται επεξεργασία ειδικής κατηγορίας δεδομένων και απαιτεί σαφή νομική βάση."
            articles={[
              { number: "6", title: "Νόμιμη επεξεργασία", summary: "Κάθε ηχογράφηση απαιτεί μια από τις 6 νόμιμες βάσεις επεξεργασίας του Άρθρου 6." },
              { number: "13", title: "Ενημέρωση υποκειμένων", summary: "Οι καλούντες πρέπει να ενημερώνονται για την ηχογράφηση πριν ή κατά τη σύνδεση." },
              { number: "5(1)(e)", title: "Περιορισμός αποθήκευσης", summary: "Τα δεδομένα διατηρούνται μόνο για όσο χρόνο είναι απαραίτητο." },
              { number: "28", title: "Εκτελεστής επεξεργασίας", summary: "Σύμβαση DPA υποχρεωτική με κάθε πάροχο VoIP που επεξεργάζεται δεδομένα σας." },
            ]}
            tips={[
              "Ηχητική ειδοποίηση στην αρχή κάθε κλήσης ('Η κλήση ηχογραφείται...')",
              "Διατήρηση εγγραφών max 90 ημέρες για εμπορικές συναλλαγές",
              "DPA υποχρεωτική με κάθε τρίτο πάροχο VoIP",
              "Κρυπτογράφηση AES για αρχεία ηχογράφησης",
            ]}
          />
        </div>
      </main>
    </div>
  );
}
