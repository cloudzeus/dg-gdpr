import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { LegalSidebar } from "@/components/shared/legal-sidebar";
import { createDbAccessLog } from "@/actions/dev";
import { Database } from "lucide-react";

export default async function NewDbAccessPage() {
  const session = await auth();
  const projects = await prisma.project.findMany({ select: { id: true, name: true }, where: { status: "ACTIVE" } });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar userName={session?.user?.name} userRole={(session?.user as any)?.role} pageTitle="Καταγραφή Πρόσβασης σε ΒΔ" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-6">
          <div className="flex-1 max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" /> Νέα Εγγραφή Πρόσβασης
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form action={createDbAccessLog} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Έργο *</label>
                    <Select name="projectId" required>
                      <option value="">Επιλέξτε έργο...</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Όνομα Προγραμματιστή *</label>
                    <Input name="developerName" placeholder="Ονοματεπώνυμο" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">ΒΔ Πελάτη *</label>
                    <Input name="clientDb" placeholder="π.χ. SoftOne Production DB, MSSQL-Client-A" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Τύπος ΒΔ</label>
                      <Select name="dbType">
                        <option value="SOFTONE">SoftOne</option>
                        <option value="MYSQL">MySQL</option>
                        <option value="MSSQL">MS SQL Server</option>
                        <option value="POSTGRESQL">PostgreSQL</option>
                        <option value="ORACLE">Oracle</option>
                        <option value="OTHER">Άλλο</option>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Τύπος Πρόσβασης</label>
                      <Select name="accessType">
                        <option value="READ">Ανάγνωση (READ)</option>
                        <option value="WRITE">Εγγραφή (WRITE)</option>
                        <option value="DELETE">Διαγραφή (DELETE)</option>
                        <option value="SCHEMA_CHANGE">Αλλαγή Σχήματος</option>
                        <option value="BACKUP">Backup</option>
                        <option value="RESTORE">Restore</option>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Λόγος Πρόσβασης *</label>
                    <Textarea name="accessReason" placeholder="Αναλυτική περιγραφή του λόγου πρόσβασης στη ΒΔ..." required rows={3} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Νομική Βάση</label>
                    <Input name="legalBasis" placeholder="π.χ. Εκτέλεση σύμβασης, Εντολή πελάτη" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Εγκρίθηκε από</label>
                    <Input name="approvedBy" placeholder="Ονοματεπώνυμο εγκρίνοντα" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="submit">Αποθήκευση Εγγραφής</Button>
                    <a href="/dev"><Button type="button" variant="outline">Ακύρωση</Button></a>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
          <LegalSidebar
            title="Πρόσβαση σε ΒΔ Πελατών"
            summary="Κάθε πρόσβαση προγραμματιστή σε παραγωγική βάση δεδομένων πελάτη πρέπει να τεκμηριώνεται και να έχει εγκριθεί."
            articles={[
              { number: "29", title: "Επεξεργασία υπό την εποπτεία", summary: "Εκτελεστές επεξεργασίας (developers) ενεργούν μόνο βάσει εντολής του υπευθύνου." },
              { number: "32", title: "Ασφάλεια", summary: "Μέτρα πρόληψης μη εξουσιοδοτημένης πρόσβασης σε δεδομένα." },
              { number: "5(1)(f)", title: "Ακεραιότητα και εμπιστευτικότητα", summary: "Τα δεδομένα πρέπει να προστατεύονται από μη εξουσιοδοτημένη επεξεργασία." },
            ]}
            tips={[
              "Χρησιμοποιείτε πάντα VPN για απομακρυσμένη πρόσβαση",
              "Μην αντιγράφετε δεδομένα παραγωγής σε τοπικά μηχανήματα",
              "Καταγράψτε μόνο τα δεδομένα που είναι απαραίτητα",
            ]}
          />
        </div>
      </main>
    </div>
  );
}
