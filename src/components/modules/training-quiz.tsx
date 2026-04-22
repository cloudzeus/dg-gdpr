"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitTrainingResult } from "@/actions/training";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn, scoreToGrade } from "@/lib/utils";
import { CheckCircle2, XCircle, Award, RotateCcw, ChevronRight } from "lucide-react";

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  weight: number;
}

interface Props {
  moduleId: string;
  passingScore: number;
  questions: Question[];
  userId: string;
}

type Phase = "start" | "quiz" | "review" | "result";

export function TrainingQuiz({ moduleId, passingScore, questions, userId }: Props) {
  const [phase, setPhase] = useState<Phase>("start");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean; earned: number; maxPoints: number } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const q = questions[current];
  const progress = ((current) / questions.length) * 100;
  const grade = result ? scoreToGrade(result.score) : null;

  const handleSelect = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    setShowExplanation(true);
    setAnswers((prev) => ({ ...prev, [q.id]: idx }));
  };

  const handleNext = () => {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
      setSelected(null);
      setShowExplanation(false);
    } else {
      // Submit
      startTransition(async () => {
        const r = await submitTrainingResult(moduleId, answers);
        setResult(r);
        setPhase("result");
        router.refresh();
      });
    }
  };

  const handleRestart = () => {
    setPhase("start");
    setCurrent(0);
    setAnswers({});
    setSelected(null);
    setShowExplanation(false);
    setResult(null);
  };

  if (phase === "start") {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Award className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-bold">Έτοιμοι για Αξιολόγηση;</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {questions.length} ερωτήσεις · Βάσιμη βαθμολογία: {passingScore}%
          </p>
        </div>
        <Button onClick={() => setPhase("quiz")} className="mx-auto">
          Έναρξη Εξέτασης
        </Button>
      </div>
    );
  }

  if (phase === "result" && result) {
    return (
      <div className={`rounded-xl border-2 p-8 text-center space-y-5 ${
        result.passed
          ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/20"
          : "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/20"
      }`}>
        <div className="text-6xl">{result.passed ? "🎉" : "📚"}</div>
        <div>
          <p className={`text-5xl font-black ${grade?.color}`}>{result.score}%</p>
          <p className={`text-lg font-bold mt-1 ${grade?.color}`}>
            {result.passed ? "Συγχαρητήρια! Πέρασες!" : "Δεν πέρασε — Δοκίμασε ξανά"}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {result.earned} / {result.maxPoints} πόντοι · Βάσιμη: {passingScore}%
          </p>
        </div>

        {!result.passed && (
          <div className="rounded-lg bg-orange-100 dark:bg-orange-950/30 p-3 text-sm text-orange-800 dark:text-orange-300">
            Απαιτείται επανεκπαίδευση εντός 30 ημερών για συμμόρφωση GDPR
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={handleRestart} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Επανάληψη
          </Button>
          <a href="/training">
            <Button>Πίσω στις Ενότητες</Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Ερώτηση {current + 1} από {questions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Question card */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
            {current + 1}
          </span>
          <p className="text-base font-medium leading-snug">{q.question}</p>
        </div>

        {/* Options */}
        <div className="space-y-2">
          {q.options.map((opt, idx) => {
            const isSelected = selected === idx;
            const isCorrect = idx === q.correctAnswer;
            const showResult = selected !== null;

            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={selected !== null}
                className={cn(
                  "w-full text-left rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all",
                  !showResult && "border-border hover:border-primary/50 hover:bg-primary/5",
                  showResult && isCorrect && "border-green-500 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200",
                  showResult && isSelected && !isCorrect && "border-red-500 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200",
                  showResult && !isSelected && !isCorrect && "border-border opacity-50",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full border text-xs font-bold">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{opt}</span>
                  {showResult && isCorrect && <CheckCircle2 className="ml-auto h-4 w-4 text-green-600 shrink-0" />}
                  {showResult && isSelected && !isCorrect && <XCircle className="ml-auto h-4 w-4 text-red-600 shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {showExplanation && q.explanation && (
          <div className="rounded-lg bg-secondary/70 p-3.5 text-sm">
            <p className="font-semibold text-xs text-muted-foreground mb-1 uppercase">Επεξήγηση</p>
            <p>{q.explanation}</p>
          </div>
        )}
      </div>

      {/* Next button */}
      {selected !== null && (
        <div className="flex justify-end">
          <Button onClick={handleNext} disabled={isPending} className="gap-2">
            {current < questions.length - 1 ? (
              <><ChevronRight className="h-4 w-4" /> Επόμενη</>
            ) : (
              isPending ? "Υποβολή..." : "Υποβολή Εξέτασης"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
