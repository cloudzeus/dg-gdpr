"use client";

import { scoreToGrade } from "@/lib/utils";

interface Props { score: number }

export function ComplianceGauge({ score }: Props) {
  const pct = Math.min(100, Math.max(0, score));
  const grade = scoreToGrade(pct);

  const radius = 60;
  const circumference = Math.PI * radius;
  const dash = (pct / 100) * circumference;

  const strokeColor =
    pct >= 90 ? "#16a34a" :
    pct >= 75 ? "#65a30d" :
    pct >= 60 ? "#ca8a04" :
    pct >= 40 ? "#ea580c" : "#dc2626";

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="160" height="90" viewBox="0 0 160 90">
        {/* Track */}
        <path
          d="M 10 80 A 70 70 0 0 1 150 80"
          fill="none"
          stroke="rgb(var(--border))"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Progress */}
        <path
          d="M 10 80 A 70 70 0 0 1 150 80"
          fill="none"
          stroke={strokeColor}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
        {/* Score text */}
        <text x="80" y="72" textAnchor="middle" className="fill-foreground" fontSize="24" fontWeight="700">
          {Math.round(pct)}%
        </text>
      </svg>
      <span className={`text-sm font-semibold px-3 py-1 rounded-full ${grade.bg} ${grade.color}`}>
        {grade.label}
      </span>
    </div>
  );
}
