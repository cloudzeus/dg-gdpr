export interface FieldDef { key: string; label: string; inputType: string; required: boolean }
export interface PurposeDef { id: string; label: string; description: string; required: boolean }
export interface CaptureProjectInfo { slug: string; name: string; description: string }
export interface CaptureTemplateProps {
  project: CaptureProjectInfo;
  fields: FieldDef[];
  purposes: PurposeDef[];
}
export type CaptureTemplate = (props: CaptureTemplateProps) => React.JSX.Element;

/** Pick the contact email/phone from configured field types (shared by templates). */
export function findContactFields(fields: FieldDef[]) {
  return {
    emailField: fields.find((f) => f.inputType === "EMAIL") ?? null,
    phoneField: fields.find((f) => f.inputType === "PHONE") ?? null,
  };
}
