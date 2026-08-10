import { prisma } from "@/lib/prisma";
import { ExtractionSchema } from "@/lib/intake/schemas";
import { buildComplianceProfile, type ComplianceProfile } from "@/lib/intake/compliance-profile";
import type { RemedyContext, ContextParty } from "./types";

/**
 * Χτίζεται ΜΙΑ φορά ανά εκτέλεση, όχι ανά κενό: είκοσι κενά δεν πρέπει να
 * σημαίνουν είκοσι φορές το ίδιο query.
 */
export async function buildRemedyContext(intakeId: string, userId: string): Promise<RemedyContext> {
  const intake = await prisma.complianceIntake.findUniqueOrThrow({
    where: { id: intakeId },
    include: { parties: true },
  });

  const extraction = ExtractionSchema.parse(intake.extraction ?? {});
  const profile = (intake.profileSnapshot as ComplianceProfile | null) ?? (await buildComplianceProfile());

  const toParty = (p: (typeof intake.parties)[number]): ContextParty => ({
    id: p.id,
    companyId: p.companyId,
    name: p.extractedName,
    vat: p.extractedVat,
    address: p.extractedAddress,
    email: p.extractedEmail,
    representative: p.extractedRep,
    side: p.side as ContextParty["side"],
    role: p.confirmedRole as ContextParty["role"],
  });

  return {
    intakeId,
    intakeTitle: intake.title,
    userId,
    projectId: intake.projectId,
    extraction,
    profile,
    ours: intake.parties.filter((p) => p.side !== "EXTERNAL").map(toParty),
    external: intake.parties.filter((p) => p.side === "EXTERNAL").map(toParty),
    dataProcessingVendors: extraction.vendors
      .filter((v) => v.triage === "PROCESSES_DATA")
      .map((v) => v.name),
  };
}
