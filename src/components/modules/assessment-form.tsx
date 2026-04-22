"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveAssessmentAnswers } from "@/actions/assessment";
import { Button } from "@/components/ui/button";
import {
  getComplianceLevel,
  calculateCategoryScore,
  type AssessmentQuestion,
  type AnswerValue,
} from "@/lib/assessment-questions";
import { CheckCircle2, AlertTriangle, XCircle, Info, Save, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  categoryId: string;
  questions: AssessmentQuestion[];
  savedAnswers: Record<string, AnswerValue>;
  savedSituations?: Record<string, string>;
}

const priorityBadge: Record<string, string> = {
  critical: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400",
  low: "bg-secondary text-muted-foreground",
};

const weightLabel: Record<number, string> = { 1: "Βαρύτητα ×1", 2: "Βαρύτητα ×2", 3: "Βαρύτητα ×3" };

export function AssessmentForm({ categoryId, questions, savedAnswers, savedSituations = {} }: Props) {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>(savedAnswers);
  const [situations, setSituations] = useState<Record<string, string>>(savedSituations);
  const [expandedHints, setExpandedHints] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const setAnswer = (id: string, val: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [id]: val }));
    setSaved(false);
  };

  const setSituation = (id: string, text: string) => {
    setSituations((prev) => ({ ...prev, [id]: text }));
    setSaved(false);
  };

  const toggleHint = (id: string) =>
    setExpandedHints((prev) => ({ ...prev, [id]: !prev[id] }));

  const { percentage } = calculateCategoryScore(questions, answers);
  const level = Object.values(answers).some((v) => v !== null)
    ? getComplianceLevel(percentage)
    : null;

  const answered = Object.values(answers).filter((v) => v !== null).length;

  const handleSave = () => {
    startTransition(async () => {
      await saveAssessmentAnswers(categoryId, answers, situations);
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{answered} / {questions.length} απαντημένες</span>
        {level && (
          <span className={`font-semibold ${level.color}`}>
            {level.icon} {level.label}
          </span>
        )}
      </div>

      {/* Questions */}
      {questions.map((q, idx) => {
        const ans = answers[q.id];
        const showAction = ans === "no" || ans === "partial";
        const action = ans === "no" ? q.actionIfNo : q.actionIfPartial;

        return (
          <div
            key={q.id}
            className={cn(
              "rounded-xl border-2 p-4 transition-colors",
              ans === "yes" ? "border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/10" :
              ans === "partial" ? "border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-950/10" :
              ans === "no" ? "border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/10" :
              "border-border"
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-start gap-2.5 flex-1">
                <span className="mt-0.5 shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {idx + 1}
                </span>
                <div>
                  <p className="text-sm font-medium leading-snug">{q.text}</p>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-xs text-muted-foreground bg-secondary rounded px-1.5 py-0.5">
                      Άρθρο {q.article}
                    </span>
                    <span className={cn("text-xs rounded px-1.5 py-0.5", priorityBadge[q.priority])}>
                      {q.priority === "critical" ? "Κρίσιμο" : q.priority === "high" ? "Υψηλό" : q.priority === "medium" ? "Μέτριο" : "Χαμηλό"}
                    </span>
                    <span className="text-xs text-muted-foreground bg-secondary rounded px-1.5 py-0.5">
                      {weightLabel[q.weight]}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Answer buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setAnswer(q.id, "yes")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg border-2 py-2.5 text-sm font-semibold transition-all",
                  ans === "yes"
                    ? "border-green-500 bg-green-500 text-white shadow-sm"
                    : "border-border hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-950/20"
                )}
              >
                <CheckCircle2 className="h-4 w-4" /> Ναι
              </button>
              <button
                onClick={() => setAnswer(q.id, "partial")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg border-2 py-2.5 text-sm font-semibold transition-all",
                  ans === "partial"
                    ? "border-orange-500 bg-orange-500 text-white shadow-sm"
                    : "border-border hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                )}
              >
                <AlertTriangle className="h-4 w-4" /> Μερικώς
              </button>
              <button
                onClick={() => setAnswer(q.id, "no")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg border-2 py-2.5 text-sm font-semibold transition-all",
                  ans === "no"
                    ? "border-red-500 bg-red-500 text-white shadow-sm"
                    : "border-border hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                )}
              >
                <XCircle className="h-4 w-4" /> Όχι
              </button>
            </div>

            {/* Current situation description */}
            <div className="mt-3">
              <label htmlFor={`sit-${q.id}`} className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Περιγραφή υφιστάμενης κατάστασης
              </label>
              <textarea
                id={`sit-${q.id}`}
                value={situations[q.id] ?? ""}
                onChange={(e) => setSituation(q.id, e.target.value)}
                rows={2}
                placeholder="Τι κάνετε σήμερα για αυτό το σημείο; Υπάρχοντα μέτρα, εργαλεία, διαδικασίες, ελλείψεις..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
              />
            </div>

            {/* Action required */}
            {showAction && (
              <div className={cn(
                "mt-3 rounded-lg p-3 text-xs",
                ans === "no" ? "bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-300" :
                "bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-300"
              )}>
                <p className="font-semibold mb-0.5">
                  {ans === "no" ? "🔴 Απαιτείται άμεση ενέργεια:" : "🟠 Απαιτείται βελτίωση:"}
                </p>
                <p>{action}</p>
              </div>
            )}

            {/* Hint toggle */}
            {q.hint && (
              <button
                onClick={() => toggleHint(q.id)}
                className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Info className="h-3.5 w-3.5" />
                Περισσότερα
                {expandedHints[q.id] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}
            {q.hint && expandedHints[q.id] && (
              <p className="mt-1.5 text-xs text-muted-foreground bg-secondary/50 rounded-lg p-2.5">
                {q.hint}
              </p>
            )}
          </div>
        );
      })}

      {/* Save button */}
      <div className="sticky bottom-4 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isPending}
          className={cn("gap-2 shadow-lg", saved && "bg-green-600 hover:bg-green-700")}
        >
          <Save className="h-4 w-4" />
          {isPending ? "Αποθήκευση..." : saved ? "✓ Αποθηκεύτηκε" : "Αποθήκευση Απαντήσεων"}
        </Button>
      </div>
    </div>
  );
}
