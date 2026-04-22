"use client";

import { useState } from "react";
import { Sparkles, Loader2, ChevronDown, ChevronUp, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Gap {
  category: string;
  question: string;
  action: string;
  priority: string;
}

interface AiPlanItem {
  title: string;
  description: string;
  article: string;
  effort: string;
}

interface AiPhase {
  phase: number;
  title: string;
  items: AiPlanItem[];
}

interface AiPlan {
  summary: string;
  estimatedTimeline: string;
  phases: AiPhase[];
}

interface Props {
  gaps: Gap[];
  overallScore: number;
  orgName?: string;
  hasDpia: boolean;
  hasDpa: boolean;
  hasMapper: boolean;
}

const effortColors: Record<string, string> = {
  χαμηλό: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
  μέτριο: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
  υψηλό: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
};

const phaseColors = [
  "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/10",
  "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/10",
  "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/10",
];

const phaseHeaderColors = [
  "text-red-700 dark:text-red-400",
  "text-orange-700 dark:text-orange-400",
  "text-blue-700 dark:text-blue-400",
];

export function ActionPlanAiButton({ gaps, overallScore, orgName, hasDpia, hasDpa, hasMapper }: Props) {
  const [plan, setPlan] = useState<AiPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number[]>([0]);

  async function generate() {
    setLoading(true);
    setError(null);
    setPlan(null);
    try {
      const res = await fetch("/api/ai/action-plan-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gaps, overallScore, orgName, hasDpia, hasDpa, hasMapper }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data: AiPlan = await res.json();
      setPlan(data);
      setExpanded([0]);
    } catch (e: any) {
      setError(e.message ?? "Άγνωστο σφάλμα");
    } finally {
      setLoading(false);
    }
  }

  function togglePhase(idx: number) {
    setExpanded((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-semibold text-violet-700 dark:text-violet-400">
            Πρόταση Ελάχιστης Συμμόρφωσης (AI)
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={generate}
          disabled={loading || gaps.length === 0}
          className="gap-2 border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:hover:bg-violet-950/30"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {loading ? "Ανάλυση..." : plan ? "Ανανέωση" : "Δημιουργία Πρότασης"}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {plan && (
        <div className="space-y-3">
          {/* Summary card */}
          <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/20 p-4">
            <p className="text-sm text-violet-800 dark:text-violet-300 leading-relaxed">{plan.summary}</p>
            <div className="flex items-center gap-1.5 mt-3 text-xs text-violet-600 dark:text-violet-400">
              <Clock className="h-3.5 w-3.5" />
              <span>Εκτιμώμενος χρόνος: <strong>{plan.estimatedTimeline}</strong></span>
            </div>
          </div>

          {/* Phases */}
          {plan.phases?.map((phase, idx) => (
            <div
              key={phase.phase}
              className={`rounded-xl border ${phaseColors[idx] ?? phaseColors[2]}`}
            >
              <button
                onClick={() => togglePhase(idx)}
                className="w-full flex items-center justify-between p-3.5 text-left"
              >
                <div className="flex items-center gap-2">
                  <Zap className={`h-4 w-4 ${phaseHeaderColors[idx] ?? phaseHeaderColors[2]}`} />
                  <span className={`text-sm font-semibold ${phaseHeaderColors[idx] ?? phaseHeaderColors[2]}`}>
                    {phase.title}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {phase.items?.length ?? 0} ενέργειες
                  </Badge>
                </div>
                {expanded.includes(idx) ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {expanded.includes(idx) && (
                <div className="px-3.5 pb-3.5 space-y-2.5">
                  {phase.items?.map((item, i) => (
                    <div key={i} className="rounded-lg bg-background/60 border border-border p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold leading-snug">{item.title}</p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${effortColors[item.effort] ?? effortColors["μέτριο"]}`}>
                            {item.effort}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1.5 font-mono">{item.article}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
