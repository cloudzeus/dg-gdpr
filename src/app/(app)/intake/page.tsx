import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewIntakeButton } from "./new-intake-button";
import { FileSearch, ChevronRight } from "lucide-react";

const STATUS_LABEL: Record<string, { text: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" }> = {
  DRAFT:           { text: "Πρόχειρο",        variant: "secondary" },
  PROCESSING:      { text: "Σε επεξεργασία",  variant: "default" },
  AWAITING_REVIEW: { text: "Προς έλεγχο",     variant: "warning" },
  COMMITTED:       { text: "Ολοκληρώθηκε",    variant: "success" },
  FAILED:          { text: "Σφάλμα",          variant: "destructive" },
  CANCELLED:       { text: "Ακυρώθηκε",       variant: "secondary" },
};

export default async function IntakeListPage() {
  const session = await auth();
  const intakes = await prisma.complianceIntake.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { documents: true, parties: true, gaps: true } } },
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar userName={session?.user?.name} userRole={(session?.user as any)?.role} pageTitle="Πρόσληψη Συμβάσεων" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Ανέβασε σύμβαση ή προσφορά και ο οδηγός εντοπίζει τα μέρη, τους ρόλους και τα κενά συμμόρφωσης.
            </p>
            <NewIntakeButton />
          </div>

          {intakes.length === 0 && (
            <Card>
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                <FileSearch className="h-8 w-8 mx-auto mb-3 opacity-40" />
                Καμία πρόσληψη ακόμη.
              </CardContent>
            </Card>
          )}

          {intakes.map((i) => {
            const s = STATUS_LABEL[i.status] ?? STATUS_LABEL.DRAFT;
            return (
              <Link key={i.id} href={`/intake/${i.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{i.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {i._count.documents} έγγραφα · {i._count.parties} μέρη · {i._count.gaps} κενά ·{" "}
                        {new Intl.DateTimeFormat("el-GR", { dateStyle: "medium", timeStyle: "short" }).format(i.updatedAt)}
                      </p>
                    </div>
                    <Badge variant={s.variant}>{s.text}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
