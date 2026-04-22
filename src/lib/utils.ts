import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function scoreToGrade(score: number): {
  label: string;
  color: string;
  bg: string;
} {
  if (score >= 90) return { label: "Άριστο", color: "text-green-600", bg: "bg-green-100" };
  if (score >= 75) return { label: "Καλό", color: "text-lime-600", bg: "bg-lime-100" };
  if (score >= 60) return { label: "Μέτριο", color: "text-yellow-600", bg: "bg-yellow-100" };
  if (score >= 40) return { label: "Ανεπαρκές", color: "text-orange-600", bg: "bg-orange-100" };
  return { label: "Κρίσιμο", color: "text-red-600", bg: "bg-red-100" };
}

export function riskLevelLabel(level: string): string {
  const map: Record<string, string> = {
    LOW: "Χαμηλός",
    MEDIUM: "Μεσαίος",
    HIGH: "Υψηλός",
    CRITICAL: "Κρίσιμος",
  };
  return map[level] ?? level;
}
