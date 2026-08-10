import { describe, it, expect, vi } from "vitest";
import type { IntakeGap } from "@prisma/client";
import type { RemedyContext } from "./types";

// Το μητρώο εισάγει dpa.ts, dpia.ts, policy.ts, manual.ts, που όλα αγγίζουν
// το @/lib/prisma στο module scope — mock εδώ ώστε κανένα test να μην
// στιγμιοποιεί πραγματικό PrismaClient.
const { assessmentCreate, gapUpdate, dpaContractCreate, dpiaReportCreate, policyDocumentFindFirst } = vi.hoisted(
  () => ({
    assessmentCreate: vi.fn().mockResolvedValue({ id: "assessment-1" }),
    gapUpdate: vi.fn().mockResolvedValue({}),
    dpaContractCreate: vi.fn().mockResolvedValue({ id: "dpa-1" }),
    dpiaReportCreate: vi.fn().mockResolvedValue({ id: "dpia-1", createdAt: new Date() }),
    policyDocumentFindFirst: vi.fn().mockResolvedValue(null),
  })
);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    assessment: { create: (...a: unknown[]) => assessmentCreate(...a) },
    intakeGap: { update: (...a: unknown[]) => gapUpdate(...a) },
    dpaContract: { create: (...a: unknown[]) => dpaContractCreate(...a), update: vi.fn().mockResolvedValue({}) },
    dpiaReport: { create: (...a: unknown[]) => dpiaReportCreate(...a), update: vi.fn().mockResolvedValue({}) },
    policyDocument: {
      findFirst: (...a: unknown[]) => policyDocumentFindFirst(...a),
      create: vi.fn().mockResolvedValue({ id: "policy-1" }),
    },
  },
}));

import { executeRemedy, REGISTRY_KEYS } from "./index";

function makeGap(over: Partial<IntakeGap> = {}): IntakeGap {
  return {
    id: "gap-1",
    intakeId: "intake-1",
    category: "DPO",
    severity: "HIGH",
    title: "Δεν έχει οριστεί ΥΠΔ",
    description: "—",
    gdprArticles: null,
    remedyType: null,
    remedyPayload: null,
    policyType: null,
    status: "OPEN",
    createdEntityType: null,
    createdEntityId: null,
    dismissReason: null,
    createdAt: new Date("2026-08-01"),
    updatedAt: new Date("2026-08-01"),
    ...over,
  } as IntakeGap;
}

function makeCtx(over: Partial<RemedyContext> = {}): RemedyContext {
  return {
    intakeId: "intake-1",
    intakeTitle: "Δοκιμή",
    userId: "user-1",
    projectId: null,
    extraction: {
      parties: [],
      subject: null,
      signedAt: null,
      term: null,
      dataCategories: [],
      vendors: [],
      recipientHint: null,
      crossBorderTransfer: false,
      specialCategories: false,
      signatories: [],
    },
    profile: {
      mother: { name: "DGSOFT", vatNumber: "997939640", domains: [] },
      subsidiaries: [],
      assessment: { overall: 0, weakCategories: [] },
      policies: { active: [], missing: [], expired: [] },
      ropaDepartments: [],
      hasDpo: false,
      trainingPassRate: null,
      existingDpaCompanyIds: [],
      knownSubProcessors: [],
    },
    ours: [],
    external: [],
    dataProcessingVendors: [],
    ...over,
  } as RemedyContext;
}

describe("πληρότητα μητρώου", () => {
  it("το μητρώο καλύπτει κάθε τιμή του RemedyType", async () => {
    const { RemedyType } = await import("@prisma/client");
    for (const t of Object.keys(RemedyType)) {
      expect(REGISTRY_KEYS).toContain(t);
    }
  });

  it("υπάρχουν εννιά τύποι κάλυψης", () => {
    expect(REGISTRY_KEYS).toHaveLength(9);
  });
});

describe("executeRemedy", () => {
  it("κενό χωρίς remedyType επιστρέφει SKIPPED", async () => {
    const result = await executeRemedy(makeGap({ remedyType: null }), makeCtx());
    expect(result).toEqual({ status: "SKIPPED", reason: expect.any(String) });
  });

  it("κενό με createdEntityId επιστρέφει SKIPPED χωρίς να καλέσει εκτελεστή", async () => {
    // CREATE_DPA θα επέστρεφε ΑΛΛΟ μήνυμα SKIPPED (λείπει ζεύγος μερών) αν
    // πραγματικά εκτελούνταν — αποδεικνύει ότι το short-circuit προηγήθηκε.
    const gap = makeGap({ remedyType: "CREATE_DPA", createdEntityId: "already-there" });
    const result = await executeRemedy(gap, makeCtx());
    expect(result).toEqual({ status: "SKIPPED", reason: "Έχει ήδη καλυφθεί." });
  });

  it("άγνωστος remedyType επιστρέφει SKIPPED", async () => {
    const gap = makeGap({ remedyType: "NOT_A_REAL_TYPE" as never });
    const result = await executeRemedy(gap, makeCtx());
    expect(result.status).toBe("SKIPPED");
  });

  it("γνωστός τύπος χωρίς προηγούμενη κάλυψη εκτελεί τον αντίστοιχο εκτελεστή", async () => {
    const gap = makeGap({ remedyType: "ASSIGN_DPO" });
    const result = await executeRemedy(gap, makeCtx());
    expect(result.status).toBe("NEEDS_HUMAN");
    if (result.status === "NEEDS_HUMAN") {
      expect(result.href).toBe("/admin/positions");
    }
  });
});
