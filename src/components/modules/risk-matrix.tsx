/**
 * RiskMatrix — 5×5 Likelihood × Impact heatmap with a banded severity scale.
 *
 * Score = Likelihood × Impact (1–25). Severity bands:
 *   Very Low  1–2   · Low 3–4 · Medium 5–12 · High 15–16 · Very High 20–25
 *
 * Purely presentational. Optionally highlight a single assessed cell by passing
 * `likelihood` and `impact` (each 1–5).
 */

type Severity = "very-low" | "low" | "medium" | "high" | "very-high";

const BANDS: { key: Severity; label: string; color: string; range: string }[] = [
  { key: "very-low", label: "Πολύ Χαμηλός", color: "#256029", range: "1–2" },
  { key: "low", label: "Χαμηλός", color: "#5b9d52", range: "3–4" },
  { key: "medium", label: "Μέτριος", color: "#e6b800", range: "5–12" },
  { key: "high", label: "Υψηλός", color: "#f08784", range: "15–16" },
  { key: "very-high", label: "Πολύ Υψηλός", color: "#d62828", range: "20–25" },
];

function severityOf(score: number): Severity {
  if (score <= 2) return "very-low";
  if (score <= 4) return "low";
  if (score <= 12) return "medium";
  if (score <= 16) return "high";
  return "very-high";
}

function colorOf(score: number): string {
  return BANDS.find((b) => b.key === severityOf(score))!.color;
}

const LIKELIHOOD_LABELS = ["Πολύ Πιθανό", "Πιθανό", "Μέτριο", "Απίθανο", "Πολύ Απίθανο"];
const IMPACT_LABELS = ["Αμελητέα", "Μικρή", "Μέτρια", "Σοβαρή", "Πολύ Σοβαρή"];

export function RiskMatrix({
  likelihood,
  impact,
}: {
  likelihood?: number;
  impact?: number;
}) {
  const hasSelection =
    typeof likelihood === "number" &&
    typeof impact === "number" &&
    likelihood >= 1 &&
    likelihood <= 5 &&
    impact >= 1 &&
    impact <= 5;
  const selectedScore = hasSelection ? likelihood! * impact! : null;

  // Likelihood rows render top (5) → bottom (1)
  const rows = [5, 4, 3, 2, 1];
  const cols = [1, 2, 3, 4, 5];

  return (
    <div className="space-y-6">
      {/* Severity band scale */}
      <div className="space-y-1.5">
        {BANDS.map((b) => (
          <div key={b.key} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-xs font-semibold" style={{ color: b.color }}>
              {b.label}
            </span>
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: b.color }} />
            <div className="h-px flex-1" style={{ background: b.color, opacity: 0.45 }} />
            <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {b.range}
            </span>
          </div>
        ))}
      </div>

      {/* 5×5 matrix */}
      <div className="flex gap-2">
        {/* Y axis label */}
        <div className="flex w-5 shrink-0 items-center justify-center">
          <span
            className="text-[11px] font-semibold tracking-wide text-muted-foreground"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Πιθανότητα
          </span>
        </div>

        <div className="flex-1">
          <div className="grid grid-cols-5 gap-1">
            {rows.map((l) =>
              cols.map((im) => {
                const score = l * im;
                const isSelected = hasSelection && l === likelihood && im === impact;
                return (
                  <div
                    key={`${l}-${im}`}
                    title={`Πιθανότητα ${l} × Επίπτωση ${im} = ${score}`}
                    className="flex aspect-square items-center justify-center rounded-sm text-sm font-bold text-white transition-transform"
                    style={{
                      background: colorOf(score),
                      outline: isSelected ? "3px solid rgb(var(--foreground))" : "none",
                      outlineOffset: isSelected ? "-3px" : undefined,
                      transform: isSelected ? "scale(1.04)" : undefined,
                      opacity: hasSelection && !isSelected ? 0.55 : 1,
                    }}
                  >
                    {score}
                  </div>
                );
              })
            )}
          </div>
          {/* X axis label */}
          <div className="mt-2 text-center text-[11px] font-semibold tracking-wide text-muted-foreground">
            Επίπτωση →
          </div>
        </div>
      </div>

      {hasSelection && (
        <div
          className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm"
          style={{
            background: `${colorOf(selectedScore!)}1a`,
            border: `1px solid ${colorOf(selectedScore!)}55`,
          }}
        >
          <span className="text-muted-foreground">
            {LIKELIHOOD_LABELS[likelihood! - 1]} × {IMPACT_LABELS[impact! - 1]}
          </span>
          <span className="flex items-center gap-2 font-semibold" style={{ color: colorOf(selectedScore!) }}>
            Βαθμός Κινδύνου: {selectedScore}
            <span className="rounded-full px-2 py-0.5 text-xs text-white" style={{ background: colorOf(selectedScore!) }}>
              {BANDS.find((b) => b.key === severityOf(selectedScore!))!.label}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
