import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { LegalSidebar } from "@/components/shared/legal-sidebar";
import { saveChecklist } from "@/actions/dev";
import { riskLevelLabel, scoreToGrade } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

interface CheckItem { name: string; label: string; article: string }

const checkItems: CheckItem[] = [
  { name: "dataMinimization", label: "Ελαχιστοποίηση Δεδομένων (Data Minimization)", article: "Άρθρο 5(1)(c)" },
  { name: "encryptionAtRest", label: "Κρυπτογράφηση σε ανάπαυση (Encryption at Rest)", article: "Άρθρο 32" },
  { name: "encryptionInTransit", label: "Κρυπτογράφηση σε μεταφορά (Encryption in Transit)", article: "Άρθρο 32" },
  { name: "accessControls", label: "Έλεγχοι Πρόσβασης (RBAC / Least Privilege)", article: "Άρθρο 25" },
  { name: "inputValidation", label: "Επικύρωση Εισόδου (Input Validation)", article: "Άρθρο 32" },
  { name: "sqlInjectionPrevention", label: "Προστασία SQL Injection", article: "Άρθρο 32" },
  { name: "xssPrevention", label: "Προστασία XSS / CSRF", article: "Άρθρο 32" },
  { name: "securityHeaders", label: "Security Headers (HSTS, CSP, X-Frame)", article: "Άρθρο 32" },
  { name: "apiAuthentication", label: "Αυθεντικοποίηση API (OAuth2 / JWT)", article: "Άρθρο 32" },
  { name: "tokenManagement", label: "Διαχείριση Token / Λήξης Session", article: "Άρθρο 32" },
  { name: "loggingAuditTrail", label: "Καταγραφή & Audit Trail", article: "Άρθρο 30" },
  { name: "privacyImpactAssessed", label: "Αξιολόγηση Επιπτώσεων στην Ιδιωτικότητα", article: "Άρθρο 35" },
  { name: "retentionPolicyDefined", label: "Καθορισμός Πολιτικής Διατήρησης Δεδομένων", article: "Άρθρο 5(1)(e)" },
  { name: "dpoApproved", label: "Έγκριση από Υπεύθυνο Προστασίας Δεδομένων (DPO)", article: "Άρθρο 37" },
];

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const project = await prisma.project.findUnique({
    where: { id },
    include: { devChecklists: true },
  });
  if (!project) notFound();

  const checklist = project.devChecklists[0] ?? null;
  const score = checklist?.score ?? 0;
  const grade = scoreToGrade(score);

  const saveChecklistForProject = saveChecklist.bind(null, id);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar userName={session?.user?.name} userRole={(session?.user as any)?.role} pageTitle={`${project.name} — Privacy by Design`} />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-6">
          <div className="flex-1 space-y-6">
            {/* Project header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold">{project.name}</h2>
                  <Badge variant="secondary">{project.clientName}</Badge>
                  <Badge variant={project.riskLevel === "LOW" ? "success" : project.riskLevel === "MEDIUM" ? "warning" : "destructive"}>
                    {riskLevelLabel(project.riskLevel)}
                  </Badge>
                </div>
                {project.description && <p className="text-sm text-muted-foreground mt-1">{project.description}</p>}
              </div>
              <div className="flex items-center gap-3">
                <div className={`rounded-lg px-4 py-2 text-center ${grade.bg}`}>
                  <p className={`text-2xl font-bold ${grade.color}`}>{score}%</p>
                  <p className={`text-xs ${grade.color}`}>{grade.label}</p>
                </div>
              </div>
            </div>

            <Progress value={score} />

            {/* Checklist form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Λίστα Ελέγχου Privacy by Design
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form action={saveChecklistForProject} className="space-y-4">
                  <div className="space-y-2">
                    {checkItems.map((item) => {
                      const checked = checklist ? (checklist as any)[item.name] : false;
                      return (
                        <label
                          key={item.name}
                          className="flex items-center gap-3 rounded-lg border border-border p-3.5 cursor-pointer hover:bg-secondary/50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            name={item.name}
                            defaultChecked={checked}
                            className="h-4 w-4 rounded border-border text-primary accent-primary"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{item.article}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <div className="space-y-1.5 pt-2">
                    <label className="text-sm font-medium">Σημειώσεις / Παρατηρήσεις</label>
                    <Textarea
                      name="notes"
                      defaultValue={checklist?.notes ?? ""}
                      placeholder="Επιπλέον πληροφορίες για τη συμμόρφωση του έργου..."
                      rows={3}
                    />
                  </div>
                  <Button type="submit">Αποθήκευση Ελέγχου</Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <LegalSidebar
            title="Privacy by Design"
            summary="Ο σχεδιασμός με γνώμονα την ιδιωτικότητα απαιτεί τεχνικά μέτρα σε κάθε στάδιο ανάπτυξης λογισμικού."
            articles={[
              { number: "25", title: "Προστασία δεδομένων από σχεδιασμό", summary: "Εφαρμογή αρχών ελαχιστοποίησης δεδομένων και ψευδωνυμοποίησης εξ ορισμού." },
              { number: "32", title: "Ασφάλεια επεξεργασίας", summary: "Κρυπτογράφηση, ψευδωνυμοποίηση, εμπιστευτικότητα, ακεραιότητα και διαθεσιμότητα." },
              { number: "35", title: "Εκτίμηση Αντικτύπου", summary: "Για επεξεργασίες υψηλού κινδύνου απαιτείται DPIA πριν την έναρξη." },
            ]}
            tips={[
              "14/14 σημεία = πλήρης συμμόρφωση Privacy by Design",
              "Η έγκριση DPO τεκμηριώνει λογοδοσία (Άρθρο 5(2))",
              "Ελέγξτε ξανά μετά κάθε σημαντική αλλαγή κώδικα",
            ]}
          />
        </div>
      </main>
    </div>
  );
}
