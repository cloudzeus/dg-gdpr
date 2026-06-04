export type Locale = "el" | "en";

export interface LocalizedText {
  el: string;
  en: string;
}

export function emptyLocalized(): LocalizedText {
  return { el: "", en: "" };
}

export function loc(value: unknown, locale: Locale): string {
  if (!value || typeof value !== "object") return "";
  const v = value as Partial<Record<Locale, unknown>>;
  const requested = typeof v[locale] === "string" ? (v[locale] as string) : "";
  if (requested.trim()) return requested;
  const el = typeof v.el === "string" ? (v.el as string) : "";
  return el;
}
