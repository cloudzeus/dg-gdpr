import { auth } from "@/lib/auth";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { LegalSidebar } from "@/components/shared/legal-sidebar";
import { createProject } from "@/actions/dev";

export default async function NewProjectPage() {
  const session = await auth();
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar userName={session?.user?.name} userRole={(session?.user as any)?.role} pageTitle="Νέο Έργο Ανάπτυξης" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-6">
          <div className="flex-1 max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>Στοιχεία Έργου</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={createProject} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Όνομα Έργου *</label>
                    <Input name="name" placeholder="π.χ. ERP Integration — Πελάτης Α" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Όνομα Πελάτη *</label>
                    <Input name="clientName" placeholder="π.χ. Εταιρεία Α.Ε." required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Περιγραφή</label>
                    <Textarea name="description" placeholder="Σύντομη περιγραφή του έργου και της επεξεργασίας δεδομένων..." rows={3} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Επίπεδο Κινδύνου</label>
                    <Select name="riskLevel" defaultValue="MEDIUM">
                      <option value="LOW">Χαμηλός</option>
                      <option value="MEDIUM">Μεσαίος</option>
                      <option value="HIGH">Υψηλός</option>
                      <option value="CRITICAL">Κρίσιμος</option>
                    </Select>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="submit">Δημιουργία Έργου</Button>
                    <a href="/dev"><Button type="button" variant="outline">Ακύρωση</Button></a>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
          <LegalSidebar
            title="Ταξινόμηση Κινδύνου"
            summary="Η αξιολόγηση κινδύνου είναι το πρώτο βήμα πριν την επεξεργασία δεδομένων. Υψηλός κίνδυνος απαιτεί DPIA."
            articles={[
              { number: "35", title: "Εκτίμηση Αντικτύπου", summary: "Όταν η επεξεργασία ενδέχεται να παρουσιάσει υψηλό κίνδυνο, απαιτείται DPIA πριν την έναρξη." },
              { number: "25", title: "Privacy by Design", summary: "Τα μέτρα ασφάλειας πρέπει να ενσωματώνονται από τον σχεδιασμό του συστήματος." },
            ]}
            tips={[
              "Υψηλός κίνδυνος = DPIA υποχρεωτική",
              "Κρίσιμος κίνδυνος = διαβούλευση με ΑΠΔ",
            ]}
          />
        </div>
      </main>
    </div>
  );
}
