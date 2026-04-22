import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { LegalSidebar } from "@/components/shared/legal-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollText } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

const actionColors: Record<string, "success" | "default" | "destructive" | "warning" | "secondary"> = {
  CREATE: "success",
  UPDATE: "default",
  DELETE: "destructive",
  LOGIN: "secondary",
  EXPORT: "warning",
};

export default async function AuditPage() {
  const session = await auth();

  const logs = await prisma.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      project: { select: { name: true } },
    },
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar userName={session?.user?.name} userRole={(session?.user as any)?.role} pageTitle="Αρχείο Ελέγχου (Audit Log)" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-6">
          <div className="flex-1 space-y-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-primary" /> Αρχείο Δραστηριοτήτων
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Καταγραφή όλων των ενεργειών στην πλατφόρμα · {logs.length} εγγραφές
              </p>
            </div>

            <Card>
              <CardContent className="p-0">
                {logs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12 text-sm">Δεν υπάρχουν εγγραφές ακόμη</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-secondary/30 text-left text-xs text-muted-foreground">
                          <th className="px-4 py-3">Ενέργεια</th>
                          <th className="px-4 py-3">Οντότητα</th>
                          <th className="px-4 py-3">Χρήστης</th>
                          <th className="px-4 py-3">Έργο</th>
                          <th className="px-4 py-3">IP</th>
                          <th className="px-4 py-3">Ημ/νία & Ώρα</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {logs.map((log) => (
                          <tr key={log.id} className="hover:bg-secondary/20 transition-colors">
                            <td className="px-4 py-3">
                              <Badge variant={actionColors[log.action] ?? "secondary"}>{log.action}</Badge>
                            </td>
                            <td className="px-4 py-3 font-medium">{log.entity}</td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {log.user.name ?? log.user.email ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {log.project?.name ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                              {log.ipAddress ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {formatDateTime(log.createdAt)}
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
            title="Αρχείο Ελέγχου"
            summary="Η τήρηση αρχείου δραστηριοτήτων επεξεργασίας είναι υποχρεωτική βάσει Άρθρου 30 GDPR και αποδεικνύει τη λογοδοσία."
            articles={[
              { number: "30", title: "Αρχεία Δραστηριοτήτων", summary: "Υποχρεωτική τήρηση αρχείου με: σκοπούς επεξεργασίας, κατηγορίες, αποδέκτες, χρόνο διατήρησης." },
              { number: "5(2)", title: "Λογοδοσία", summary: "Τεκμηρίωση κάθε πρόσβασης και μετάδοσης δεδομένων." },
              { number: "58(1)", title: "Εξουσίες Εποπτικής Αρχής", summary: "Η ΑΠΔΠΧ μπορεί να ζητήσει πρόσβαση στο αρχείο ελέγχου." },
            ]}
            tips={[
              "Διατηρείτε αρχεία για τουλάχιστον 3 χρόνια",
              "Τα αρχεία πρέπει να είναι διαθέσιμα στην ΑΠΔΠΧ",
              "IP καταγραφή βοηθά στον εντοπισμό παραβιάσεων",
            ]}
          />
        </div>
      </main>
    </div>
  );
}
