import type { CaptureTemplate } from "./types";
import DefaultCapture from "./default/default-capture";
import WizardSignature from "./wizard-signature/wizard-signature";

export const CAPTURE_TEMPLATES: Record<string, CaptureTemplate> = {
  DEFAULT: DefaultCapture,
  WIZARD_SIGNATURE: WizardSignature,
};

export function resolveTemplate(key: string): CaptureTemplate {
  return CAPTURE_TEMPLATES[key] ?? DefaultCapture;
}

export const TEMPLATE_OPTIONS = [
  { value: "DEFAULT", label: "Προεπιλογή (απλή φόρμα)" },
  { value: "WIZARD_SIGNATURE", label: "Wizard με υπογραφή (Kosmocar style)" },
];
