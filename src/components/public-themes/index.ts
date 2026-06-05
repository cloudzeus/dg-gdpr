import type { PublicTheme } from "./types";
import DefaultTheme from "./default/default";
import KosmocarTheme from "./kosmocar/kosmocar";

/** Registry of public themes. The key is the layout folder shown in the URL
 * (/c/<key>/<slug>). A template = the same components with a different style. */
export const PUBLIC_THEMES: Record<string, PublicTheme> = {
  DEFAULT: DefaultTheme,
  WIZARD_SIGNATURE: KosmocarTheme, // reuse the layoutTemplate key for the public look
  KOSMOCAR: KosmocarTheme,
};

export function resolvePublicTheme(key: string): PublicTheme {
  return PUBLIC_THEMES[key] ?? DefaultTheme;
}

export function isKnownTheme(key: string): boolean {
  return key in PUBLIC_THEMES;
}
