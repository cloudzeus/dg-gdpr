import type { IntakeGap } from "@prisma/client";
import type { Extraction } from "@/lib/intake/schemas";
import type { ComplianceProfile } from "@/lib/intake/compliance-profile";
import type { PartyRoleValue } from "@/lib/intake/role-mapping";
import type { PartySideValue } from "@/lib/intake/company-match";

export interface ContextParty {
  id: string;
  companyId: string | null;
  name: string;
  vat: string | null;
  address: string | null;
  email: string | null;
  representative: string | null;
  side: PartySideValue;
  role: PartyRoleValue | null;
}

export interface RemedyContext {
  intakeId: string;
  intakeTitle: string;
  userId: string;
  projectId: string | null;
  extraction: Extraction;
  profile: ComplianceProfile;
  /** Οι δικές μας εταιρίες, με τους επιβεβαιωμένους ρόλους τους. */
  ours: ContextParty[];
  /** Οι αντισυμβαλλόμενοι. */
  external: ContextParty[];
  /** Προμηθευτές που επεξεργάζονται δεδομένα — υποψήφιοι υποεκτελούντες. */
  dataProcessingVendors: string[];
}

export type RemedyResult =
  | { status: "CREATED"; entityType: string; entityId: string; fileUrl?: string; label: string }
  | { status: "NEEDS_HUMAN"; reason: string; href: string }
  | { status: "SKIPPED"; reason: string };

export type Remedy = (gap: IntakeGap, ctx: RemedyContext) => Promise<RemedyResult>;
