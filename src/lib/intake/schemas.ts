// src/lib/intake/schemas.ts
import { z } from "zod";

/**
 * Το όριο ανάμεσα στο «τι είπε το μοντέλο» και «τι μπαίνει στη βάση».
 *
 * Τα schemas είναι επίτηδες ανεκτικά στα προαιρετικά πεδία (ένα μοντέλο θα
 * παραλείψει κάτι) και αυστηρά στα enums (ένας εφευρημένος ρόλος θα γινόταν
 * λάθος `DpaContract`).
 */

const nonEmpty = z.string().trim().min(1);
const optionalText = z
  .string()
  .trim()
  .nullish()
  .transform((v) => v || null);

export const PartyRoleEnum = z.enum([
  "CONTROLLER", "PROCESSOR", "JOINT_CONTROLLER",
  "SUB_PROCESSOR", "RECIPIENT", "THIRD_PARTY",
]);

export const GapCategoryEnum = z.enum([
  "POLICY", "DPIA", "ROPA", "TRAINING", "TECHNICAL", "CONTRACT", "DPO",
]);

export const GapSeverityEnum = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);

export const RemedyTypeEnum = z.enum([
  "CREATE_POLICY", "CREATE_DPIA", "CREATE_DPA", "CREATE_JCA",
  "CREATE_ROPA_ENTRY", "CREATE_ASSESSMENT", "ASSIGN_DPO", "CREATE_TRAINING",
]);

export const VendorTriageEnum = z.enum(["PROCESSES_DATA", "SUPPLIES_ONLY", "UNCLEAR"]);

export const ExtractedPartySchema = z.object({
  name: nonEmpty,
  vat: optionalText,
  address: optionalText,
  representative: optionalText,
  email: optionalText,
});

export const VendorSchema = z.object({
  name: nonEmpty,
  triage: VendorTriageEnum,
  /** Η φράση του εγγράφου που στηρίζει την κατάταξη. */
  evidence: optionalText,
});

export const ExtractionSchema = z.object({
  parties: z.array(ExtractedPartySchema).default([]),
  subject: optionalText,
  signedAt: optionalText,
  term: optionalText,
  dataCategories: z.array(z.string()).default([]),
  /** Σκοποί επεξεργασίας — υποχρεωτικό στοιχείο σύμβασης άρθρου 28 παρ. 3. */
  purposes: z.array(z.string()).default([]),
  vendors: z.array(VendorSchema).default([]),
  /** Ο κατονομαζόμενος αποδέκτης μιας προσφοράς — ένδειξη αντισυμβαλλομένου, όχι μέρος. */
  recipientHint: optionalText,
  crossBorderTransfer: z.boolean().default(false),
  specialCategories: z.boolean().default(false),
  signatories: z.array(z.string()).default([]),
});

export const ReasoningSchema = z.object({
  partyRoles: z
    .array(
      z.object({
        name: nonEmpty,
        role: PartyRoleEnum,
        rationale: optionalText,
        gdprArticles: z.array(z.string()).default([]),
      })
    )
    .min(1),
  gaps: z
    .array(
      z.object({
        category: GapCategoryEnum,
        severity: GapSeverityEnum,
        title: nonEmpty,
        description: nonEmpty,
        remedyType: RemedyTypeEnum.nullish().transform((v) => v ?? null),
        gdprArticles: z.array(z.string()).default([]),
      })
    )
    .default([]),
});

export type Extraction = z.infer<typeof ExtractionSchema>;
export type Reasoning = z.infer<typeof ReasoningSchema>;

/**
 * Βγάζει JSON από απάντηση μοντέλου. Τα μοντέλα τυλίγουν σε code fences και
 * προσθέτουν φλυαρία ακόμη κι όταν τους ζητηθεί ρητά να μην το κάνουν.
 */
export function parseAiJson(raw: string): unknown {
  let s = (raw ?? "").trim();
  s = s.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "").trim();

  const firstObj = s.indexOf("{");
  const firstArr = s.indexOf("[");
  const start =
    firstArr !== -1 && (firstObj === -1 || firstArr < firstObj) ? firstArr : firstObj;
  const end = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Η απάντηση δεν περιέχει JSON");
  }

  return JSON.parse(s.slice(start, end + 1));
}
