// src/app/(app)/intake/[id]/step-gaps.tsx
"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShieldAlert } from "lucide-react";
import { setGapStatus } from "@/actions/intake";
import type { getIntakeDetail } from "@/actions/intake-ui";

type Intake = Awaited<ReturnType<typeof getIntakeDetail>>["intake"];
type Gap = Intake["gaps"][number];

const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const SEVERITY_LABEL: Record<string, { text: string; variant: "destructive" | "warning" | "default" | "secondary" }> = {
  CRITICAL: { text: "Κρίσιμο", variant: "destructive" },
  HIGH: { text: "Υψηλό", variant: "warning" },
  MEDIUM: { text: "Μεσαίο", variant: "default" },
  LOW: { text: "Χαμηλό", variant: "secondary" },
};

const CATEGORY_LABEL: Record<string, string> = {
  POLICY: "Πολιτική",
  DPIA: "DPIA",
  ROPA: "RoPA",
  TRAINING: "Εκπαίδευση",
  TECHNICAL: "Τεχνικό μέτρο",
  CONTRACT: "Σύμβαση",
  DPO: "DPO",
};

const REMEDY_LABEL: Record<string, string> = {
  CREATE_POLICY: "Δημιουργία πολιτικής",
  CREATE_DPIA: "Δημιουργία DPIA",
  CREATE_DPA: "Δημιουργία DPA",
  CREATE_JCA: "Δημιουργία JCA",
  CREATE_ROPA_ENTRY: "Καταχώριση RoPA",
  CREATE_ASSESSMENT: "Νέα αξιολόγηση",
  ASSIGN_DPO: "Ορισμός DPO",
  CREATE_TRAINING: "Εκπαίδευση προσωπικού",
};

const STATUS_LABEL: Record<string, { text: string; variant: "warning" | "default" | "success" | "secondary" }> = {
  OPEN: { text: "Ανοιχτό", variant: "warning" },
  DRAFTED: { text: "Σε πρόχειρο", variant: "default" },
  RESOLVED: { text: "Καλύφθηκε", variant: "success" },
  DISMISSED: { text: "Δεν ισχύει", variant: "secondary" },
};

/** Βήμα 5: τα κενά συμμόρφωσης — τα κρίσιμα πάντα πάνω, ποτέ κρυμμένα. */
export function StepGaps({ intake }: { intake: Intake }) {
  const sorted = [...intake.gaps].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" /> Κενά Συμμόρφωσης
        </CardTitle>
        <CardDescription>
          Ταξινομημένα κατά σοβαρότητα. Ένα ανοιχτό κρίσιμο κενό μπλοκάρει την ολοκλήρωση.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {sorted.map((g) => (
            <GapRow key={g.id} gap={g} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function GapRow({ gap }: { gap: Gap }) {
  const [pending, startTransition] = useTransition();
  const [dismissing, setDismissing] = useState(false);
  const [reason, setReason] = useState(gap.dismissReason ?? "");
  const [error, setError] = useState<string | null>(null);

  const articles = Array.isArray(gap.gdprArticles) ? (gap.gdprArticles as string[]) : [];
  const severity = SEVERITY_LABEL[gap.severity] ?? SEVERITY_LABEL.LOW;
  const status = STATUS_LABEL[gap.status] ?? STATUS_LABEL.OPEN;

  function setStatus(next: "DRAFTED" | "RESOLVED") {
    setError(null);
    startTransition(() => {
      setGapStatus(gap.id, next);
    });
  }

  function submitDismiss() {
    // Το setGapStatus θα το απορρίψει ούτως ή άλλως — αλλά ο χρήστης πρέπει
    // να το μάθει πριν πατήσει, όχι μετά από αποτυχημένο αίτημα.
    if (!reason.trim()) {
      setError("Η απόρριψη κενού απαιτεί γραπτή αιτιολογία.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await setGapStatus(gap.id, "DISMISSED", reason);
        setDismissing(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Σφάλμα");
      }
    });
  }

  return (
    <li
      className="rounded-sm border p-3 space-y-2"
      style={{ borderColor: gap.severity === "CRITICAL" ? "rgba(164,38,44,0.35)" : "rgb(var(--border))" }}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={severity.variant}>{severity.text}</Badge>
        <Badge variant="outline">{CATEGORY_LABEL[gap.category] ?? gap.category}</Badge>
        <Badge variant={status.variant}>{status.text}</Badge>
      </div>

      <div className="space-y-1">
        <p className="font-medium text-sm">{gap.title}</p>
        <p className="text-sm text-muted-foreground">{gap.description}</p>
      </div>

      {articles.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {articles.map((a) => (
            <Badge key={a} variant="outline">
              {a}
            </Badge>
          ))}
        </div>
      )}

      {gap.remedyType && (
        <p className="text-xs text-muted-foreground">
          Προτεινόμενη κάλυψη: <span className="font-medium">{REMEDY_LABEL[gap.remedyType] ?? gap.remedyType}</span>
        </p>
      )}

      {gap.status === "DISMISSED" && gap.dismissReason && (
        <p className="text-xs text-muted-foreground italic">Αιτιολογία απόρριψης: {gap.dismissReason}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending || gap.status === "DRAFTED"}
          onClick={() => setStatus("DRAFTED")}
        >
          Σε πρόχειρο
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending || gap.status === "RESOLVED"}
          onClick={() => setStatus("RESOLVED")}
        >
          Καλύφθηκε
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setDismissing((v) => !v);
            setError(null);
          }}
        >
          Δεν ισχύει
        </Button>
        {pending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {dismissing && (
        <div className="space-y-1.5 pt-1">
          <Textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Αιτιολογία απόρριψης — υποχρεωτική"
            rows={2}
            className="text-sm"
          />
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" disabled={pending || !reason.trim()} onClick={submitDismiss}>
              Υποβολή απόρριψης
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setDismissing(false)}>
              Άκυρο
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </li>
  );
}
