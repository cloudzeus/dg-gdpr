"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

export function Progress({ className, value = 0, max = 100, ...props }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  /* Microsoft Fluent compliance colors */
  const color =
    pct >= 90 ? "rgb(16,124,16)" :
    pct >= 75 ? "rgb(73,130,5)" :
    pct >= 60 ? "rgb(202,93,0)" :
    pct >= 40 ? "rgb(209,52,56)" :
    "rgb(164,38,44)";

  return (
    <div
      className={cn("relative h-1.5 w-full overflow-hidden rounded-sm", className)}
      style={{ background: "#edebe9" }}
      {...props}
    >
      <div
        className="h-full rounded-sm transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}
