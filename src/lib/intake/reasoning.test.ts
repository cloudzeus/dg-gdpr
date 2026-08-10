// src/lib/intake/reasoning.test.ts
import { describe, it, expect, vi } from "vitest";
import { reasonAboutRoles, type ConfirmedParty } from "./reasoning";
import type { ComplianceProfile } from "./compliance-profile";
import type { Extraction } from "./schemas";

const profile: ComplianceProfile = {
  mother: { name: "DGSOFT", vatNumber: "997939640", domains: ["dgsoft.gr"] },
  subsidiaries: [],
  assessment: { overall: 90, weakCategories: [] },
  policies: { active: ["SECURITY_POLICY"], missing: ["DATA_BREACH"], expired: [] },
  ropaDepartments: ["IT"],
  hasDpo: true,
  trainingPassRate: 0.8,
  existingDpaCompanyIds: [],
  knownSubProcessors: [],
};

const extraction: Extraction = {
  parties: [
    { name: "DGSOFT ΕΕ", vat: "997939640", address: null, representative: null, email: null },
    { name: "ΚΟΣΜΟΚΑΡ Α.Ε.", vat: "094059163", address: null, representative: null, email: null },
  ],
  subject: "Ανάπτυξη λογισμικού",
  signedAt: null,
  term: null,
  dataCategories: ["Στοιχεία πελατών"],
  vendors: [],
  recipientHint: null,
  crossBorderTransfer: false,
  specialCategories: false,
  signatories: [],
};

const parties: ConfirmedParty[] = [
  { name: "DGSOFT ΕΕ", vat: "997939640", side: "OWN_MOTHER" },
  { name: "ΚΟΣΜΟΚΑΡ Α.Ε.", vat: "094059163", side: "EXTERNAL" },
];

const VALID = JSON.stringify({
  partyRoles: [
    { name: "DGSOFT ΕΕ", role: "PROCESSOR", rationale: "Κατ' εντολή.", gdprArticles: ["28"] },
    { name: "ΚΟΣΜΟΚΑΡ Α.Ε.", role: "CONTROLLER", rationale: "Καθορίζει σκοπούς.", gdprArticles: ["24"] },
  ],
  gaps: [
    { category: "CONTRACT", severity: "CRITICAL", title: "Λείπει DPA",
      description: "Δεν υπάρχει σύμβαση άρθρου 28.", remedyType: "CREATE_DPA", gdprArticles: ["28"] },
  ],
});

describe("reasonAboutRoles", () => {
  it("επιστρέφει επικυρωμένη κρίση", async () => {
    const chat = vi.fn().mockResolvedValue(VALID);
    const r = await reasonAboutRoles(extraction, profile, parties, { chat });

    expect(r.partyRoles).toHaveLength(2);
    expect(r.gaps[0].remedyType).toBe("CREATE_DPA");
  });

  it("περνά το προφίλ και τα μέρη στο prompt", async () => {
    const chat = vi.fn().mockResolvedValue(VALID);
    await reasonAboutRoles(extraction, profile, parties, { chat });

    const user = chat.mock.calls[0][0].user;
    expect(user).toContain("ΚΟΣΜΟΚΑΡ");
    expect(user).toContain("997939640");
    expect(user).toContain("DATA_BREACH");
  });

  it("δίνει τα μέρη ως δεδομένο κλειστό σύνολο, όχι από την εξαγωγή", async () => {
    const chat = vi.fn().mockResolvedValue(VALID);
    await reasonAboutRoles(extraction, profile, parties, { chat });

    const user = chat.mock.calls[0][0].user;
    expect(user).toContain("ΤΑ ΜΕΡΗ (δεδομένα");
  });

  it("χωρίζει τους προμηθευτές ανά τριάγε στο prompt", async () => {
    const chat = vi.fn().mockResolvedValue(VALID);
    const extractionWithVendors: Extraction = {
      ...extraction,
      vendors: [
        { name: "Yeastar", triage: "PROCESSES_DATA", evidence: "PBX cloud" },
        { name: "MikroTik", triage: "SUPPLIES_ONLY", evidence: "προμήθεια δρομολογητών" },
      ],
    };
    await reasonAboutRoles(extractionWithVendors, profile, parties, { chat });

    const user = chat.mock.calls[0][0].user;
    const processesIdx = user.indexOf("ΕΠΕΞΕΡΓΑΖΟΝΤΑΙ ΔΕΔΟΜΕΝΑ");
    const suppliesIdx = user.indexOf("ΑΠΛΩΣ ΠΡΟΜΗΘΕΥΟΥΝ");
    const yeastarIdx = user.indexOf("Yeastar");
    const mikrotikIdx = user.indexOf("MikroTik");

    // Ο Yeastar (PROCESSES_DATA) εμφανίζεται στην ομάδα υποεκτελούντων,
    // ο MikroTik (SUPPLIES_ONLY) στην ομάδα «δεν δικαιολογεί κενό».
    expect(yeastarIdx).toBeGreaterThan(processesIdx);
    expect(yeastarIdx).toBeLessThan(suppliesIdx);
    expect(mikrotikIdx).toBeGreaterThan(suppliesIdx);
    expect(user).toContain("δεν δικαιολογούν κενό");
  });

  it("ξαναπροσπαθεί μία φορά σε άκυρη απάντηση", async () => {
    const chat = vi.fn()
      .mockResolvedValueOnce('{"partyRoles":[{"name":"Χ","role":"ΑΓΝΩΣΤΟΣ"}]}')
      .mockResolvedValueOnce(VALID);
    const r = await reasonAboutRoles(extraction, profile, parties, { chat });

    expect(chat).toHaveBeenCalledTimes(2);
    expect(r.partyRoles).toHaveLength(2);
  });

  it("πετά όταν αποτύχουν και οι δύο προσπάθειες", async () => {
    const chat = vi.fn().mockResolvedValue("δεν ξέρω");
    await expect(reasonAboutRoles(extraction, profile, parties, { chat })).rejects.toThrow(/κρίση/i);
    expect(chat).toHaveBeenCalledTimes(2);
  });

  it("πετά ελληνικό σφάλμα όταν δεν δοθούν μέρη", async () => {
    const chat = vi.fn();
    await expect(reasonAboutRoles(extraction, profile, [], { chat })).rejects.toThrow(/μέρη/i);
    expect(chat).not.toHaveBeenCalled();
  });
});
