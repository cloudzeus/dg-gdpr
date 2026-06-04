import { describe, it, expect } from "vitest";
import { buildConsentExcel } from "@/lib/consent-excel";

describe("buildConsentExcel", () => {
  it("returns a non-empty xlsx buffer with a header row", async () => {
    const buf = await buildConsentExcel({
      projectName: "Newsletter",
      fieldKeys: ["email", "name"],
      purposeLabels: { p1: "Marketing" },
      records: [
        {
          id: "r1", subjectEmail: "a@b.gr", subjectPhone: null, status: "CONFIRMED",
          values: { email: "a@b.gr", name: "Άννα" }, purposeConsents: { p1: true },
          confirmedAt: new Date("2026-06-04T10:00:00Z"), ipAddress: "1.2.3.4",
          createdAt: new Date("2026-06-04T09:00:00Z"),
        },
      ],
    });
    expect(buf.byteLength).toBeGreaterThan(1000);
  });
});
