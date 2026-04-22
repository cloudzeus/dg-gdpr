"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Snapshot {
  id: string;
  overallScore: number;
  gapCount: number;
  criticalCount: number;
  takenAt: Date | string;
}

interface Props {
  snapshots: Snapshot[];
}

function formatDate(d: Date | string) {
  const date = new Date(d);
  return date.toLocaleDateString("el-GR", { day: "2-digit", month: "short" });
}

function formatDateFull(d: Date | string) {
  const date = new Date(d);
  return date.toLocaleDateString("el-GR", { day: "2-digit", month: "long", year: "numeric" });
}

export function ComplianceHistoryCard({ snapshots }: Props) {
  if (snapshots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Δεν υπάρχουν ιστορικά δεδομένα ακόμη. Η πρώτη εγγραφή θα αποθηκευτεί αυτόματα.
      </div>
    );
  }

  const data = snapshots.map((s) => ({
    date: formatDate(s.takenAt),
    dateFull: formatDateFull(s.takenAt),
    score: Math.round(s.overallScore),
    gaps: s.gapCount,
    critical: s.criticalCount,
  }));

  const latest = data[data.length - 1];
  const prev = data.length > 1 ? data[data.length - 2] : null;
  const delta = prev ? latest.score - prev.score : null;

  const TrendIcon =
    delta === null ? Minus : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendColor =
    delta === null ? "text-muted-foreground" : delta > 0 ? "text-green-600 dark:text-green-400" : delta < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground";

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="rounded-lg border bg-background shadow-lg p-3 text-xs space-y-1">
        <p className="font-semibold">{d.dateFull}</p>
        <p>Βαθμός: <strong>{d.score}%</strong></p>
        <p>Κενά: {d.gaps} ({d.critical} κρίσιμα)</p>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-black">{latest.score}%</p>
          <p className="text-xs text-muted-foreground">τελευταία μέτρηση</p>
        </div>
        {delta !== null && (
          <div className={`flex items-center gap-1 text-sm font-semibold ${trendColor}`}>
            <TrendIcon className="h-4 w-4" />
            <span>{delta > 0 ? "+" : ""}{delta}%</span>
          </div>
        )}
      </div>

      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ReferenceLine y={50} stroke="#f97316" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ fill: "#8b5cf6", r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-3 text-[10px] text-muted-foreground/70">
        <span className="flex items-center gap-1"><span className="inline-block w-3 border-t border-dashed border-green-500" /> ≥80% συμμόρφωση</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 border-t border-dashed border-orange-500" /> 50% όριο</span>
      </div>

      <p className="text-[10px] text-muted-foreground">{snapshots.length} μετρήσεις — ιστορικό έως {formatDateFull(snapshots[0].takenAt)}</p>
    </div>
  );
}
