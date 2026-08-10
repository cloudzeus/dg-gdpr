// src/app/(app)/intake/[id]/step-reading.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw, Sparkles } from "lucide-react";
import type { getIntakeDetail } from "@/actions/intake-ui";

type Intake = Awaited<ReturnType<typeof getIntakeDetail>>["intake"];
type Doc = Intake["documents"][number];

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type LocalStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED";

const STATUS_LABEL: Record<LocalStatus, { text: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" }> = {
  PENDING: { text: "Σε αναμονή", variant: "secondary" },
  RUNNING: { text: "Διαβάζεται...", variant: "default" },
  DONE: { text: "Διαβάστηκε", variant: "success" },
  FAILED: { text: "Απέτυχε", variant: "destructive" },
};

/** Ένα request ανά έγγραφο — μια πολυσέλιδη σύμβαση δεν διαβάζεται μέσα σε ένα. */
async function readOne(documentId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/intake/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Σφάλμα ανάγνωσης" };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Σφάλμα δικτύου" };
  }
}

export function StepReading({ intake }: { intake: Intake }) {
  const router = useRouter();
  const [statuses, setStatuses] = useState<Record<string, LocalStatus>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reading, startReading] = useTransition();
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  function statusOf(d: Doc): LocalStatus {
    return statuses[d.id] ?? (d.ocrStatus as LocalStatus);
  }

  function readAll() {
    const targets = intake.documents.filter((d) => {
      const s = statusOf(d);
      return s === "PENDING" || s === "FAILED";
    });
    if (targets.length === 0) return;

    setStatuses((prev) => {
      const next = { ...prev };
      targets.forEach((d) => { next[d.id] = "RUNNING"; });
      return next;
    });
    setErrors((prev) => {
      const next = { ...prev };
      targets.forEach((d) => { delete next[d.id]; });
      return next;
    });

    // Παράλληλα requests — η αποτυχία ενός δεν σταματά τα υπόλοιπα.
    startReading(async () => {
      await Promise.all(
        targets.map(async (d) => {
          const result = await readOne(d.id);
          setStatuses((prev) => ({ ...prev, [d.id]: result.ok ? "DONE" : "FAILED" }));
          if (!result.ok) setErrors((prev) => ({ ...prev, [d.id]: result.error }));
        })
      );
      router.refresh();
    });
  }

  function retryOne(d: Doc) {
    setStatuses((prev) => ({ ...prev, [d.id]: "RUNNING" }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[d.id];
      return next;
    });
    startReading(async () => {
      const result = await readOne(d.id);
      setStatuses((prev) => ({ ...prev, [d.id]: result.ok ? "DONE" : "FAILED" }));
      if (!result.ok) setErrors((prev) => ({ ...prev, [d.id]: result.error }));
      router.refresh();
    });
  }

  async function analyze() {
    setAnalyzeError(null);
    setAnalyzing(true);
    try {
      const res = await fetch("/api/intake/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intakeId: intake.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Σφάλμα ανάλυσης");
      router.refresh();
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : "Σφάλμα ανάλυσης");
    } finally {
      setAnalyzing(false);
    }
  }

  const hasPendingOrFailed = intake.documents.some((d) => {
    const s = statusOf(d);
    return s === "PENDING" || s === "FAILED";
  });
  const allDone = intake.documents.length > 0 && intake.documents.every((d) => statusOf(d) === "DONE");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ανάγνωση</CardTitle>
        <CardDescription>
          Κάθε έγγραφο διαβάζεται ξεχωριστά, παράλληλα με τα υπόλοιπα — μια πολυσέλιδη σύμβαση δεν χωράει σε ένα αίτημα.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2">
          {intake.documents.map((d) => {
            const status = statusOf(d);
            const label = STATUS_LABEL[status];
            const isDocx = d.mimeType === DOCX_MIME;
            return (
              <li key={d.id} className="rounded-sm border border-border px-3 py-2 text-sm space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex-1 min-w-0 truncate">{d.fileName}</span>
                  <Badge variant={label.variant}>{label.text}</Badge>
                  {status === "FAILED" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => retryOne(d)}
                      disabled={reading}
                    >
                      <RotateCcw className="h-3 w-3" /> Επανάληψη
                    </Button>
                  )}
                </div>

                {status === "FAILED" && (errors[d.id] ?? d.ocrError) && (
                  <p className="text-xs text-destructive">{errors[d.id] ?? d.ocrError}</p>
                )}

                {status === "DONE" && (
                  isDocx ? (
                    <p className="text-xs text-muted-foreground">Word — χωρίς OCR</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Ποιότητα {d.ocrQuality != null ? d.ocrQuality.toFixed(2) : "—"} · μοντέλο {d.ocrModel ?? "—"}
                      {d.escalated && " · κλιμακώθηκε σε ακριβότερο μοντέλο"}
                    </p>
                  )
                )}
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {hasPendingOrFailed && (
            <Button type="button" onClick={readAll} disabled={reading} className="gap-1.5">
              {reading && <Loader2 className="h-4 w-4 animate-spin" />}
              {reading ? "Ανάγνωση..." : "Ανάγνωση εγγράφων"}
            </Button>
          )}

          {allDone && (
            <Button type="button" variant="outline" onClick={analyze} disabled={analyzing} className="gap-1.5">
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {analyzing ? "Ανάλυση..." : "Ανάλυση"}
            </Button>
          )}
          {allDone && (
            <span className="text-[11px] text-muted-foreground">Η ανάλυση διαρκεί 25–45 δευτερόλεπτα.</span>
          )}
        </div>

        {analyzeError && <p className="text-xs text-destructive">{analyzeError}</p>}
      </CardContent>
    </Card>
  );
}
