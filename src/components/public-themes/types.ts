import type { ReactNode } from "react";

/** A public theme is a shell that wraps the consent screens and sets the visual
 * style (brand chrome + CSS variables like --accent) for the same components. */
export type PublicTheme = (props: { children: ReactNode }) => React.JSX.Element;
