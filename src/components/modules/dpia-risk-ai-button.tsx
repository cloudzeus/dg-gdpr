"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { assessDpiaRisk } from "@/actions/dpia";

interface Suggestion {
  likelihood: number;
  impact: number;
  reasoning: string;
}

interface Props {
  id: string;
  title: string;
  processingPurpose: string;
  risks: string[];
  mitigations: string[];
}

const LIKELIHOOD_LABELS = ["Πολύ Απίθανο", "Απίθανο", "Μέτριο", "Πιθανό", "Πολύ Πιθανό"];
const IMPACT_LABELS = ["Αμελητέα", "Μικρή", "Μέτρια", "Σοβαρή", "Πολύ Σοβαρή"];

export function DpiaRiskAiButton({ id, title, processingPurpose, risks, mitigations }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [applied, setApplied] = useState(false);

  async function assess() {
    setLoading(true);
    setError(null);
    setSuggestion(null);
    setApplied(false);
    try {
      const res = await fetch("/api/ai/dpia-risk-assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, processingPurpose, risks, mitigations }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data: Suggestion = await res.json();
      setSuggestion(data);
      // Persist immediately so the matrix graphic reflects the AI assessment
      await assessDpiaRisk(id, data.likelihood, data.impact, data.reasoning);
      setApplied(true);
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? "Άγνωστο σφάλμα");
    } finally {
      setLoading(false);
    }
  }

  const score = suggestion ? suggestion.likelihood * suggestion.impact : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          Αυτόματη εκτίμηση πιθανότητας & επίπτωσης με βάση τους κινδύνους και τα μέτρα.
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={assess}
          disabled={loading}
          className="shrink-0 gap-2 border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:hover:bg-violet-950/30"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? "Ανάλυση..." : suggestion ? "Επανεκτίμηση" : "Εκτίμηση με AI"}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {suggestion && (
        <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/20 p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span>
              <span className="text-muted-foreground">Πιθανότητα:</span>{" "}
              <strong>{suggestion.likelihood}</strong> — {LIKELIHOOD_LABELS[suggestion.likelihood - 1]}
            </span>
            <span>
              <span className="text-muted-foreground">Επίπτωση:</span>{" "}
              <strong>{suggestion.impact}</strong> — {IMPACT_LABELS[suggestion.impact - 1]}
            </span>
            <span>
              <span className="text-muted-foreground">Βαθμός:</span> <strong>{score}</strong>
            </span>
          </div>
          {suggestion.reasoning && (
            <div className="rounded-lg border border-violet-200 dark:border-violet-800 bg-white/70 dark:bg-violet-950/40 px-3 py-2.5">
              <p className="text-[13px] leading-relaxed text-foreground">
                <span className="font-semibold text-violet-700 dark:text-violet-300">Αιτιολόγηση AI: </span>
                {suggestion.reasoning}
              </p>
            </div>
          )}
          {applied && (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" /> Εφαρμόστηκε στη μήτρα παρακάτω
            </span>
          )}
        </div>
      )}
    </div>
  );
}
