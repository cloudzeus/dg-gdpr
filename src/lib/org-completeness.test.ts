import { describe, it, expect } from "vitest";
import { findOrgGaps, isOrgIdentifiable, ORG_NAME_PLACEHOLDER, type OrgLike } from "./org-completeness";

const complete: OrgLike = {
  name: "DGSOFT Ε.Ε.",
  legalName: "DGSOFT ΕΤΕΡΟΡΡΥΘΜΗ ΕΤΑΙΡΕΙΑ",
  vatNumber: "123456789",
  taxOffice: "ΦΑΕ ΑΘΗΝΩΝ",
  addressLine1: "Λεωφ. Κηφισίας 1",
  city: "Αθήνα",
  postalCode: "11523",
  domains: ["dgsoft.gr"],
  emails: [{ label: "Info", address: "info@dgsoft.gr" }],
};

const keys = (org: OrgLike | null) => findOrgGaps(org).map((g) => g.key);
const required = (org: OrgLike | null) =>
  findOrgGaps(org).filter((g) => g.severity === "required").map((g) => g.key);

describe("findOrgGaps", () => {
  it("δεν βρίσκει ελλείψεις σε πλήρη οργανισμό", () => {
    expect(findOrgGaps(complete)).toEqual([]);
  });

  it("θεωρεί τα πάντα ελλιπή όταν δεν υπάρχει καθόλου οργανισμός", () => {
    expect(required(null)).toEqual(["name", "vatNumber", "domains"]);
    expect(required(undefined as never)).toEqual(["name", "vatNumber", "domains"]);
  });

  it("βάζει τα required πριν τα recommended", () => {
    const severities = findOrgGaps({}).map((g) => g.severity);
    expect(severities.indexOf("recommended")).toBeGreaterThan(severities.lastIndexOf("required"));
  });

  describe("ΑΦΜ", () => {
    it.each([null, undefined, "", "   "])("λείπει όταν είναι %p", (vatNumber) => {
      expect(required({ ...complete, vatNumber })).toContain("vatNumber");
    });

    it("δεν λείπει όταν έχει τιμή", () => {
      expect(required(complete)).not.toContain("vatNumber");
    });
  });

  describe("επωνυμία", () => {
    it("το placeholder «Οργανισμός» μετράει ως έλλειψη", () => {
      expect(required({ ...complete, name: ORG_NAME_PLACEHOLDER })).toContain("name");
    });

    it("το placeholder με κενά γύρω του επίσης", () => {
      expect(required({ ...complete, name: `  ${ORG_NAME_PLACEHOLDER}  ` })).toContain("name");
    });

    it("επωνυμία που απλώς περιέχει τη λέξη δεν είναι έλλειψη", () => {
      expect(required({ ...complete, name: "Οργανισμός Λιμένος Πειραιώς" })).not.toContain("name");
    });
  });

  describe("domains", () => {
    it.each([
      ["κενός πίνακας", []],
      ["πίνακας με κενά strings", ["", "  "]],
      ["όχι πίνακας", "dgsoft.gr"],
      ["null", null],
      ["undefined", undefined],
    ])("λείπει όταν είναι %s", (_label, domains) => {
      expect(required({ ...complete, domains })).toContain("domains");
    });

    it("δεν λείπει με ένα έγκυρο domain", () => {
      expect(required({ ...complete, domains: ["dgsoft.gr"] })).not.toContain("domains");
    });

    it("αγνοεί τα κενά και κρατά τα υπόλοιπα", () => {
      expect(required({ ...complete, domains: ["", "dgsoft.gr"] })).not.toContain("domains");
    });
  });

  describe("emails", () => {
    it("πίνακας αντικειμένων με κενές τιμές μετράει ως έλλειψη", () => {
      expect(keys({ ...complete, emails: [{ label: "", address: "" }] })).toContain("emails");
    });

    it("πίνακας αντικειμένων με τιμή δεν είναι έλλειψη", () => {
      expect(keys({ ...complete, emails: [{ label: "Info", address: "a@b.gr" }] })).not.toContain("emails");
    });
  });

  describe("έδρα", () => {
    it.each(["addressLine1", "city", "postalCode"] as const)(
      "λείπει όταν λείπει το %s",
      (field) => {
        expect(keys({ ...complete, [field]: null })).toContain("address");
      }
    );

    it("αναφέρεται μία φορά ακόμη κι αν λείπουν όλα τα πεδία της", () => {
      const gaps = keys({ ...complete, addressLine1: null, city: null, postalCode: null });
      expect(gaps.filter((k) => k === "address")).toHaveLength(1);
    });
  });
});

describe("isOrgIdentifiable", () => {
  it("true για πλήρη οργανισμό", () => {
    expect(isOrgIdentifiable(complete)).toBe(true);
  });

  it("true όταν λείπουν μόνο recommended", () => {
    expect(isOrgIdentifiable({ name: "DGSOFT Ε.Ε.", vatNumber: "123456789", domains: ["dgsoft.gr"] })).toBe(true);
  });

  it.each(["vatNumber", "domains", "name"] as const)("false όταν λείπει το %s", (field) => {
    expect(isOrgIdentifiable({ ...complete, [field]: field === "domains" ? [] : null })).toBe(false);
  });

  it("false όταν δεν υπάρχει οργανισμός", () => {
    expect(isOrgIdentifiable(null)).toBe(false);
  });
});
