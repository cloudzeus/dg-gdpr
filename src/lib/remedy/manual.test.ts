import { describe, it, expect, vi } from "vitest";
import type { IntakeGap } from "@prisma/client";
import type { RemedyContext } from "./types";

// vi.mock είναι hoisted πριν τα imports· τα mocks πρέπει να ζουν μέσα σε
// vi.hoisted ώστε να υπάρχουν ήδη τη στιγμή που τρέχει το factory.
const { assessmentCreate, gapUpdate } = vi.hoisted(() => ({
  assessmentCreate: vi.fn().mockResolvedValue({ id: "assessment-1" }),
  gapUpdate: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    assessment: { create: (...args: unknown[]) => assessmentCreate(...args) },
    intakeGap: { update: (...args: unknown[]) => gapUpdate(...args) },
  },
}));

import { assignDpo, createTraining, createRopaEntry, createAssessment } from "./manual";

function makeGap(over: Partial<IntakeGap> = {}): IntakeGap {
  return {
    id: "gap-1",
    intakeId: "intake-1",
    category: "DPIA",
    severity: "HIGH",
    title: "Λείπει DPIA",
    description: "Η συνεργασία επεξεργάζεται δεδομένα υψηλού κινδύνου χωρίς DPIA.",
    gdprArticles: null,
    remedyType: "CREATE_ASSESSMENT",
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
    intakeTitle: "Δοκιμή — Πρόταση B2B",
    userId: "user-1",
    projectId: "project-1",
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

describe("χειροκίνητοι εκτελεστές", () => {
  it.each([
    ["assignDpo", assignDpo, "/admin/positions"],
    ["createTraining", createTraining, "/admin/training"],
    ["createRopaEntry", createRopaEntry, "/mapper"],
  ] as const)("%s επιστρέφει NEEDS_HUMAN με λόγο και σύνδεσμο", async (_name, remedy, expectedHref) => {
    const result = await remedy(makeGap(), makeCtx());
    expect(result.status).toBe("NEEDS_HUMAN");
    if (result.status !== "NEEDS_HUMAN") throw new Error("unreachable");
    expect(result.reason.trim().length).toBeGreaterThan(0);
    expect(result.href.startsWith("/")).toBe(true);
    expect(result.href).toBe(expectedHref);
  });

  it("createAssessment δημιουργεί την Assessment πριν επιστρέψει NEEDS_HUMAN", async () => {
    assessmentCreate.mockClear();
    gapUpdate.mockClear();

    const result = await createAssessment(makeGap(), makeCtx());

    expect(assessmentCreate).toHaveBeenCalledTimes(1);
    expect(assessmentCreate.mock.calls[0][0].data.projectId).toBe("project-1");
    expect(gapUpdate).toHaveBeenCalledTimes(1);

    expect(result.status).toBe("NEEDS_HUMAN");
    if (result.status !== "NEEDS_HUMAN") throw new Error("unreachable");
    expect(result.reason).toContain("assessment-1");
    expect(result.href.startsWith("/")).toBe(true);
  });

  it("createAssessment παραλείπεται χωρίς έργο", async () => {
    assessmentCreate.mockClear();
    const result = await createAssessment(makeGap(), makeCtx({ projectId: null }));
    expect(result.status).toBe("SKIPPED");
    expect(assessmentCreate).not.toHaveBeenCalled();
  });

  it("createAssessment παραλείπεται αν το κενό έχει ήδη αξιολόγηση στο remedyPayload", async () => {
    assessmentCreate.mockClear();
    const gap = makeGap({ remedyPayload: { assessmentId: "assessment-1" } as never });
    const result = await createAssessment(gap, makeCtx());
    expect(result).toEqual({ status: "SKIPPED", reason: "Έχει ήδη καλυφθεί." });
    expect(assessmentCreate).not.toHaveBeenCalled();
  });
});
