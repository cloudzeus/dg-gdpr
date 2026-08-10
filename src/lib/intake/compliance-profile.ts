// src/lib/intake/compliance-profile.ts
import { prisma } from "@/lib/prisma";
import {
  ASSESSMENT_CATEGORIES,
  calculateCategoryScore,
  type AnswerValue,
} from "@/lib/assessment-questions";
import type { MatchCandidate } from "./company-match";

/**
 * Read-only στιγμιότυπο της συμμόρφωσης του ΟΜΙΛΟΥ.
 *
 * Δίνεται ως context στο DeepSeek ώστε η κρίση να μην είναι «τι λέει το χαρτί»
 * αλλά «τι σημαίνει αυτό το χαρτί για εμάς, δεδομένου του πού βρισκόμαστε».
 * Αποθηκεύεται στο `ComplianceIntake.profileSnapshot` ως τεκμήριο: έξι μήνες
 * μετά πρέπει να φαίνεται με ΤΙ δεδομένα ελήφθη η απόφαση.
 */

export interface ComplianceProfile {
  mother: { name: string; vatNumber: string | null; domains: string[] };
  subsidiaries: { name: string; vatNumber: string | null }[];
  assessment: { overall: number; weakCategories: string[] };
  policies: { active: string[]; missing: string[]; expired: string[] };
  ropaDepartments: string[];
  hasDpo: boolean;
  trainingPassRate: number | null;
  existingDpaCompanyIds: string[];
  knownSubProcessors: string[];
}

/** Οι εταιρίες που είμαστε «εμείς» — μαμά και θυγατρικές — για αντιστοίχιση. */
export async function getOwnGroupCandidates(): Promise<MatchCandidate[]> {
  const [org, companies] = await Promise.all([
    prisma.organization.findFirst({ orderBy: { createdAt: "asc" } }),
    prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, name: true, legalName: true, vatNumber: true, relationships: true },
    }),
  ]);

  const candidates: MatchCandidate[] = [];

  if (org) {
    candidates.push({
      id: "org",
      name: org.name,
      legalName: org.legalName,
      vatNumber: org.vatNumber,
      side: "OWN_MOTHER",
    });
  }

  for (const c of companies) {
    const rels = Array.isArray(c.relationships) ? (c.relationships as unknown[]) : [];
    const isSubsidiary = rels.some((r) => r === "SUBSIDIARY");
    candidates.push({
      id: c.id,
      name: c.name,
      legalName: c.legalName,
      vatNumber: c.vatNumber,
      side: isSubsidiary ? "OWN_GROUP" : "EXTERNAL",
    });
  }

  return candidates;
}

export async function buildComplianceProfile(): Promise<ComplianceProfile> {
  const [org, companies, assessments, policies, flows, keyPositions, training, dpas, providerDpas] =
    await Promise.all([
      prisma.organization.findFirst({ orderBy: { createdAt: "asc" } }),
      prisma.company.findMany({
        where: { isActive: true },
        select: { name: true, vatNumber: true, relationships: true },
      }),
      prisma.assessment.findMany({ select: { title: true, answers: true } }),
      prisma.policyDocument.findMany({ select: { type: true, status: true, reviewDate: true } }),
      prisma.departmentFlow.findMany({ select: { department: true } }),
      prisma.position.count({ where: { isKeyRole: true } }),
      prisma.trainingResult.findMany({ select: { passed: true } }),
      prisma.dpaContract.findMany({ where: { companyId: { not: null } }, select: { companyId: true } }),
      prisma.providerDpa.findMany({ select: { providerName: true } }),
    ]);

  const subsidiaries = companies
    .filter((c) => (Array.isArray(c.relationships) ? c.relationships : []).some((r) => r === "SUBSIDIARY"))
    .map((c) => ({ name: c.name, vatNumber: c.vatNumber }));

  // Assessment: score ανά κατηγορία, κρατάμε τις αδύναμες
  const weakCategories: string[] = [];
  let total = 0;
  let counted = 0;
  for (const cat of ASSESSMENT_CATEGORIES) {
    const row = assessments.find((a) => a.title === cat.id);
    // `Assessment.title` κρατά το ID της κατηγορίας — έτσι το διαβάζει και το dashboard.
    const answers = (row?.answers ?? {}) as Record<string, AnswerValue>;
    const { percentage } = calculateCategoryScore(cat.questions, answers);
    total += percentage;
    counted += 1;
    if (percentage < 70) weakCategories.push(cat.title);
  }

  const now = new Date();
  const activeTypes = policies.filter((p) => p.status === "ACTIVE").map((p) => p.type as string);
  const expired = policies
    .filter((p) => p.status === "ACTIVE" && p.reviewDate && p.reviewDate < now)
    .map((p) => p.type as string);
  const allTypes = [...new Set(policies.map((p) => p.type as string))];
  const missing = POLICY_ESSENTIALS.filter((t) => !activeTypes.includes(t) && !allTypes.includes(t));

  const passRate =
    training.length === 0 ? null : training.filter((t) => t.passed).length / training.length;

  return {
    mother: {
      name: org?.name ?? "—",
      vatNumber: org?.vatNumber ?? null,
      domains: Array.isArray(org?.domains) ? (org!.domains as string[]) : [],
    },
    subsidiaries,
    assessment: {
      overall: counted === 0 ? 0 : Math.round(total / counted),
      weakCategories,
    },
    policies: { active: activeTypes, missing, expired: [...new Set(expired)] },
    ropaDepartments: flows.map((f) => f.department),
    hasDpo: keyPositions > 0,
    trainingPassRate: passRate,
    existingDpaCompanyIds: [...new Set(dpas.map((d) => d.companyId!).filter(Boolean))],
    knownSubProcessors: [...new Set(providerDpas.map((p) => p.providerName))],
  };
}

/** Οι πολιτικές χωρίς τις οποίες δεν στέκει φάκελος συμμόρφωσης σε έλεγχο. */
const POLICY_ESSENTIALS = [
  "SECURITY_POLICY",
  "DATA_RETENTION",
  "INCIDENT_RESPONSE",
  "ACCESS_CONTROL",
  "PRIVACY_NOTICE",
  "DATA_BREACH",
  "VENDOR_MANAGEMENT",
];
