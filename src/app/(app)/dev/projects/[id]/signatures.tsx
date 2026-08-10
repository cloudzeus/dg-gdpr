import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { createSignatureRequests } from "@/actions/signature";
import {
  canCompleteProject,
  latestPerDocument,
  type SignatureState,
  type GapState,
  type DocumentSignature,
} from "@/lib/signature/completion";
import { signatureTestRecipient } from "@/lib/signature/recipient";
import { SignatureRowActions } from "./signature-actions";
import { CompleteProjectButton } from "./complete-project-button";
import { FileSignature, PlusCircle, CheckCircle2 } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Εκκρεμεί δημιουργία",
  SENT: "Στάλθηκε",
  VIEWED: "Προβλήθηκε",
  SIGNED: "Υπεγράφη",
  DECLINED: "Αρνήθηκε / Ακυρώθηκε",
  EXPIRED: "Έληξε",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "success" | "warning"> = {
  PENDING: "secondary",
  SENT: "default",
  VIEWED: "warning",
  SIGNED: "success",
  DECLINED: "destructive",
  EXPIRED: "destructive",
};

export async function SignaturesPanel({ projectId }: { projectId: string }) {
  const [project, requests, intakes] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { status: true } }),
    prisma.signatureRequest.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } }),
    prisma.complianceIntake.findMany({
      where: { projectId },
      select: { gaps: { select: { severity: true, status: true, dismissReason: true } } },
    }),
  ]);

  // Τίτλος εγγράφου ανά αίτημα — batch query, όχι N+1. Μόνο DpaContract
  // περνά προς το παρόν από το κύκλωμα υπογραφής (Task 5 του plan).
  const dpaIds = requests.filter((r) => r.entityType === "DpaContract").map((r) => r.entityId);
  const contracts = dpaIds.length
    ? await prisma.dpaContract.findMany({ where: { id: { in: dpaIds } }, select: { id: true, title: true } })
    : [];
  const titleById = new Map(contracts.map((c) => [c.id, c.title]));
  const titleFor = (r: (typeof requests)[number]) =>
    r.entityType === "DpaContract" ? (titleById.get(r.entityId) ?? "Έγγραφο") : "Έγγραφο";

  // Ίδια λογική με το completeProject: μόνο το πιο πρόσφατο αίτημα ανά
  // έγγραφο μετράει — αλλιώς ένα ληγμένο που αντικαταστάθηκε θα έδειχνε το
  // κλείσιμο μπλοκαρισμένο ενώ το τρέχον αίτημα έχει ήδη υπογραφεί.
  const signatureStates: (SignatureState & DocumentSignature)[] = latestPerDocument(
    requests.map((r) => ({
      status: r.status,
      recipientName: r.recipientName,
      declineReason: r.declineReason,
      entityType: r.entityType,
      entityId: r.entityId,
      createdAt: r.createdAt,
    }))
  );
  const gapStates: GapState[] = intakes.flatMap((intake) => intake.gaps);
  const verdict = canCompleteProject(signatureStates, gapStates);

  const testRecipient = signatureTestRecipient();

  async function createRequestsForProject() {
    "use server";
    await createSignatureRequests(projectId);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-primary" />
          Κύκλωμα Υπογραφής
        </CardTitle>
        <form action={createRequestsForProject}>
          <Button type="submit" variant="outline" size="sm" className="gap-1.5">
            <PlusCircle className="h-3.5 w-3.5" />
            Δημιουργία αιτημάτων από έγγραφα DPA
          </Button>
        </form>
      </CardHeader>
      <CardContent className="space-y-5">
        {testRecipient && (
          <p className="rounded-md border border-[#F7D26A] bg-[#FFF4CE] px-3 py-2 text-xs font-medium text-[#7A5B00]">
            ⚠ Δοκιμαστική λειτουργία — κάθε αποστολή αυτού του κυκλώματος πηγαίνει στη διεύθυνση{" "}
            <strong>{testRecipient}</strong>, ανεξάρτητα από τον πραγματικό παραλήπτη.
          </p>
        )}

        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Δεν υπάρχουν ακόμα αιτήματα υπογραφής. Δημιουργήστε τα από τα έγγραφα DPA του έργου.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <th className="px-3 py-2">Έγγραφο</th>
                  <th className="px-3 py-2">Παραλήπτης</th>
                  <th className="px-3 py-2">Κατάσταση</th>
                  <th className="px-3 py-2">Στάλθηκε</th>
                  <th className="px-3 py-2">Προβλήθηκε</th>
                  <th className="px-3 py-2">Υπεγράφη</th>
                  <th className="px-3 py-2">Υπενθυμίσεις</th>
                  <th className="px-3 py-2 text-right">Ενέργειες</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 align-top">
                    <td className="px-3 py-2.5 font-medium">{titleFor(r)}</td>
                    <td className="px-3 py-2.5">
                      <div>{r.recipientName}</div>
                      <div className="text-xs text-muted-foreground">{r.recipientEmail || "—"}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
                      {r.status === "DECLINED" && r.declineReason && (
                        <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">{r.declineReason}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{formatDateTime(r.sentAt)}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{formatDateTime(r.viewedAt)}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{formatDateTime(r.signedAt)}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.reminderCount}/3</td>
                    <td className="px-3 py-2.5">
                      <SignatureRowActions
                        requestId={r.id}
                        status={r.status}
                        hasEmail={!!r.recipientEmail.trim()}
                        uploadedUrl={r.uploadedUrl}
                        testRecipient={testRecipient}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <p className="mb-2 text-sm font-semibold">Κλείσιμο έργου</p>
          {project?.status === "COMPLETED" ? (
            <p className="flex items-center gap-2 text-sm font-medium text-green-700">
              <CheckCircle2 className="h-4 w-4" /> Το έργο έχει ολοκληρωθεί.
            </p>
          ) : (
            <CompleteProjectButton projectId={projectId} allowed={verdict.allowed} reasons={verdict.reasons} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
