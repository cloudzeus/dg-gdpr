// src/app/(app)/intake/[id]/page.tsx
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { Topbar } from "@/components/layout/topbar";
import { getIntakeDetail } from "@/actions/intake-ui";
import { checkCommit } from "@/actions/intake";
import { Stepper } from "./stepper";
import { StepDocuments } from "./step-documents";
import { StepReading } from "./step-reading";
import { StepParties } from "./step-parties";
import { StepGaps } from "./step-gaps";
import { StepCommit } from "./step-commit";

export default async function IntakeWizardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  let detail;
  try {
    detail = await getIntakeDetail(id);
  } catch {
    notFound();
  }
  const { intake, extraction } = detail;
  const verdict = await checkCommit(id);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar userName={session?.user?.name} userRole={(session?.user as any)?.role} pageTitle={intake.title} />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Stepper current={intake.stage} />

          {intake.lastError && (
            <div className="rounded-sm px-4 py-3 text-sm"
                 style={{ background: "rgba(164,38,44,0.06)", border: "1px solid rgba(164,38,44,0.22)", color: "#a4262c" }}>
              <strong>Το τελευταίο βήμα απέτυχε.</strong> {intake.lastError}
            </div>
          )}

          {intake.status === "COMMITTED" && intake.projectId && (
            <div className="rounded-sm px-4 py-3 text-sm"
                 style={{ background: "rgba(16,124,16,0.08)", border: "1px solid rgba(16,124,16,0.25)", color: "#107c10" }}>
              Η πρόσληψη ολοκληρώθηκε. <a className="underline" href={`/dev/projects/${intake.projectId}`}>Άνοιγμα έργου</a>
            </div>
          )}

          <StepDocuments intake={intake} />
          {intake.documents.length > 0 && <StepReading intake={intake} />}
          {extraction && <StepParties intake={intake} extraction={extraction} />}
          {intake.gaps.length > 0 && <StepGaps intake={intake} />}
          {intake.parties.length > 0 && <StepCommit intake={intake} verdict={verdict} />}
        </div>
      </main>
    </div>
  );
}
