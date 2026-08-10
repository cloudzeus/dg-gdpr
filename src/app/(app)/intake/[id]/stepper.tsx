// src/app/(app)/intake/[id]/stepper.tsx
import { Check } from "lucide-react";

export const STEPS = [
  { stage: "UPLOAD",     label: "Έγγραφα" },
  { stage: "OCR",        label: "Ανάγνωση" },
  { stage: "EXTRACTION", label: "Εξαγωγή" },
  { stage: "MATCHING",   label: "Μέρη & Ρόλοι" },
  { stage: "REASONING",  label: "Κενά" },
  { stage: "REVIEW",     label: "Σύνοψη" },
] as const;

export function Stepper({ current }: { current: string }) {
  const idx = Math.max(0, STEPS.findIndex((s) => s.stage === current));

  return (
    <ol className="flex items-center gap-1 text-xs">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li key={s.stage} className="flex items-center gap-1">
            <span
              className="flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 font-medium"
              style={{
                background: active ? "rgba(0,120,212,0.10)" : done ? "rgba(16,124,16,0.08)" : "transparent",
                color: active ? "#0078d4" : done ? "#107c10" : "rgb(var(--muted-foreground))",
              }}
            >
              {done ? <Check className="h-3 w-3" /> : <span className="tabular-nums">{i + 1}</span>}
              {s.label}
            </span>
            {i < STEPS.length - 1 && <span className="text-muted-foreground/40">›</span>}
          </li>
        );
      })}
    </ol>
  );
}
