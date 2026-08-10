// src/app/(app)/intake/[id]/step-commit.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Rocket, AlertCircle } from "lucide-react";
import { commitIntake } from "@/actions/intake";
import { toDpaRole, type PartyRoleValue } from "@/lib/intake/role-mapping";
import type { getIntakeDetail } from "@/actions/intake-ui";
import type { CommitVerdict } from "@/lib/intake/blocking-rule";

type Intake = Awaited<ReturnType<typeof getIntakeDetail>>["intake"];

const SEVERITY_LABEL: Record<string, string> = {
  CRITICAL: "Κρίσιμα",
  HIGH: "Υψηλά",
  MEDIUM: "Μεσαία",
  LOW: "Χαμηλά",
};

/** Βήμα 6: σύνοψη και δημιουργία έργου. */
export function StepCommit({ intake, verdict }: { intake: Intake; verdict: CommitVerdict }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const ours = intake.parties.filter((p) => p.side !== "EXTERNAL");
  const externals = intake.parties.filter((p) => p.side === "EXTERNAL");

  // Το πλήθος των DPA που θα προκύψουν — ίδιος υπολογισμός με το commitIntake,
  // πάνω στο ίδιο toDpaRole· δεν ξαναγράφεται η χαρτογράφηση ρόλων εδώ.
  let contractCount = 0;
  for (const o of ours) {
    for (const e of externals) {
      if (
        toDpaRole(
          o.confirmedRole as PartyRoleValue | null,
          e.confirmedRole as PartyRoleValue | null
        )
      ) {
        contractCount += 1;
      }
    }
  }

  const counterparty = externals[0]?.extractedName ?? "—";

  const gapCounts: Record<string, number> = {};
  for (const g of intake.gaps) gapCounts[g.severity] = (gapCounts[g.severity] ?? 0) + 1;

  function submit() {
    if (!window.confirm("Η δημιουργία έργου είναι μη αναστρέψιμη — θα δημιουργηθούν πραγματικές εγγραφές. Συνέχεια;")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const projectId = await commitIntake(intake.id);
        router.push(`/dev/projects/${projectId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Σφάλμα ολοκλήρωσης");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-4 w-4" /> Σύνοψη & Ολοκλήρωση
        </CardTitle>
        <CardDescription>Ο τελευταίος έλεγχος πριν δημιουργηθεί το έργο.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!verdict.allowed ? (
          <div
            className="rounded-sm p-3 space-y-1.5"
            style={{ background: "rgba(164,38,44,0.06)", border: "1px solid rgba(164,38,44,0.22)" }}
          >
            <p className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: "#a4262c" }}>
              <AlertCircle className="h-4 w-4" /> Δεν μπορεί να ολοκληρωθεί ακόμα
            </p>
            <ul className="list-disc pl-5 text-sm" style={{ color: "#a4262c" }}>
              {verdict.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div
            className="rounded-sm p-3 space-y-1.5 text-sm"
            style={{ background: "rgba(16,124,16,0.06)", border: "1px solid rgba(16,124,16,0.2)" }}
          >
            <p>
              <strong>Έργο:</strong> {intake.title}
            </p>
            <p>
              <strong>Αντισυμβαλλόμενος:</strong> {counterparty}
            </p>
            <p>
              <strong>Συμβάσεις επεξεργασίας (DPA) που θα δημιουργηθούν:</strong> {contractCount}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {Object.entries(SEVERITY_LABEL).map(([sev, label]) => (
                <Badge key={sev} variant="outline">
                  {label}: {gapCounts[sev] ?? 0}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <Button type="button" onClick={submit} disabled={!verdict.allowed || pending} className="gap-1.5">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Δημιουργία έργου
        </Button>
      </CardContent>
    </Card>
  );
}
