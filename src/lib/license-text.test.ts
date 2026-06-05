import { describe, it, expect } from "vitest";
import { buildLicenseSections } from "@/lib/license-text";

const FULL = {
  serialNumber: "DG-2026-0001",
  sellerName: "DG Smart ΙΚΕ",
  sellerVat: "800000001",
  buyerName: "Πελάτης ΑΕ",
  buyerVat: "094000002",
};

describe("buildLicenseSections", () => {
  it("returns a stable list of 9 sections", () => {
    const sections = buildLicenseSections(FULL);
    expect(sections).toHaveLength(9);
    expect(sections.every((s) => s.title.length > 0)).toBe(true);
    expect(sections.every((s) => Array.isArray(s.paragraphs) && s.paragraphs.length > 0)).toBe(true);
  });

  it("embeds serial, seller and buyer in the details section", () => {
    const details = buildLicenseSections(FULL)[0];
    const text = details.paragraphs.join(" ");
    expect(text).toContain("DG-2026-0001");
    expect(text).toContain("DG Smart ΙΚΕ");
    expect(text).toContain("800000001");
    expect(text).toContain("Πελάτης ΑΕ");
    expect(text).toContain("094000002");
  });

  it("uses a placeholder for missing fields", () => {
    const details = buildLicenseSections({
      serialNumber: null, sellerName: null, sellerVat: null, buyerName: null, buyerVat: null,
    })[0];
    const text = details.paragraphs.join(" ");
    expect(text).toContain("—");
  });

  it("omits ΑΦΜ wrapper when vat is missing but name present", () => {
    const details = buildLicenseSections({
      serialNumber: "X", sellerName: "Seller", sellerVat: null, buyerName: "Buyer", buyerVat: null,
    })[0];
    const text = details.paragraphs.join(" ");
    expect(text).toContain("Seller");
    expect(text).not.toContain("ΑΦΜ:");
  });
});
