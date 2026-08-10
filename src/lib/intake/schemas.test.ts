// src/lib/intake/schemas.test.ts
import { describe, it, expect } from "vitest";
import { ExtractionSchema, ReasoningSchema, parseAiJson } from "./schemas";

const validExtraction = {
  parties: [
    {
      name: "DGSOFT ΕΕ",
      vat: "997939640",
      address: "ΛΕΩΦ ΚΗΦΙΣΟΥ 48, ΠΕΡΙΣΤΕΡΙ",
      representative: "Γ. Κοζύρης",
      email: "info@dgsoft.gr",
    },
    { name: "ΚΟΣΜΟΚΑΡ Α.Ε.", vat: "094059163" },
  ],
  subject: "Παροχή υπηρεσιών ανάπτυξης λογισμικού",
  signedAt: "2026-03-12",
  term: "12 μήνες",
  dataCategories: ["Στοιχεία πελατών", "Στοιχεία παραγγελιών"],
  vendors: [{ name: "Bunny CDN", triage: "PROCESSES_DATA", evidence: "φιλοξενία αρχείων" }],
  recipientHint: null,
  crossBorderTransfer: false,
  specialCategories: false,
  signatories: ["Γ. Κοζύρης"],
};

describe("ExtractionSchema", () => {
  it("δέχεται πλήρη έγκυρη απάντηση", () => {
    expect(ExtractionSchema.parse(validExtraction).parties).toHaveLength(2);
  });

  it("συμπληρώνει προεπιλογές για τα προαιρετικά", () => {
    const minimal = ExtractionSchema.parse({ parties: [{ name: "Α" }] });
    expect(minimal.dataCategories).toEqual([]);
    expect(minimal.vendors).toEqual([]);
    expect(minimal.crossBorderTransfer).toBe(false);
    expect(minimal.parties[0].vat).toBeNull();
  });

  it("δέχεται κενά ή απόντα μέρη — μια προσφορά νόμιμα δεν έχει συμβαλλόμενους", () => {
    expect(ExtractionSchema.parse({ parties: [] }).parties).toEqual([]);
    expect(ExtractionSchema.parse({}).parties).toEqual([]);
  });

  it("απορρίπτει μέρος χωρίς όνομα", () => {
    expect(() => ExtractionSchema.parse({ parties: [{ vat: "997939640" }] })).toThrow();
    expect(() => ExtractionSchema.parse({ parties: [{ name: "  " }] })).toThrow();
  });

  it("αγνοεί άγνωστα πεδία αντί να σκάει", () => {
    const parsed = ExtractionSchema.parse({ ...validExtraction, hallucinatedField: "χχχ" });
    expect(parsed).not.toHaveProperty("hallucinatedField");
  });

  it("απορρίπτει λάθος τύπο", () => {
    expect(() => ExtractionSchema.parse({ parties: "DGSOFT" })).toThrow();
    expect(() => ExtractionSchema.parse({ ...validExtraction, crossBorderTransfer: "ναι" })).toThrow();
  });

  it("δέχεται έγκυρη τιμή τριάγε προμηθευτή", () => {
    const parsed = ExtractionSchema.parse({
      ...validExtraction,
      vendors: [{ name: "MikroTik", triage: "SUPPLIES_ONLY", evidence: "προμήθεια δρομολογητών" }],
    });
    expect(parsed.vendors).toEqual([
      { name: "MikroTik", triage: "SUPPLIES_ONLY", evidence: "προμήθεια δρομολογητών" },
    ]);
  });

  it("απορρίπτει άγνωστη τιμή τριάγε", () => {
    expect(() =>
      ExtractionSchema.parse({
        ...validExtraction,
        vendors: [{ name: "MikroTik", triage: "IS_A_PROCESSOR" }],
      })
    ).toThrow();
  });

  it("προεπιλέγει κενό πίνακα vendors όταν λείπει", () => {
    expect(ExtractionSchema.parse({ parties: [] }).vendors).toEqual([]);
  });
});

describe("ReasoningSchema", () => {
  const valid = {
    partyRoles: [
      { name: "DGSOFT ΕΕ", role: "PROCESSOR", rationale: "Επεξεργάζεται κατ' εντολή.", gdprArticles: ["28"] },
      { name: "ΚΟΣΜΟΚΑΡ Α.Ε.", role: "CONTROLLER", rationale: "Καθορίζει σκοπούς.", gdprArticles: ["4(7)", "24"] },
    ],
    gaps: [
      {
        category: "CONTRACT",
        severity: "CRITICAL",
        title: "Λείπει DPA",
        description: "Δεν υπάρχει σύμβαση επεξεργασίας άρθρου 28.",
        remedyType: "CREATE_DPA",
        gdprArticles: ["28"],
      },
    ],
  };

  it("δέχεται έγκυρη απάντηση", () => {
    expect(ReasoningSchema.parse(valid).gaps).toHaveLength(1);
  });

  it("επιτρέπει κενή λίστα κενών", () => {
    expect(ReasoningSchema.parse({ ...valid, gaps: [] }).gaps).toEqual([]);
  });

  it("απορρίπτει άγνωστο ρόλο", () => {
    const bad = { ...valid, partyRoles: [{ ...valid.partyRoles[0], role: "ΕΠΕΞΕΡΓΑΣΤΗΣ" }] };
    expect(() => ReasoningSchema.parse(bad)).toThrow();
  });

  it("απορρίπτει άγνωστη σοβαρότητα ή κατηγορία", () => {
    expect(() => ReasoningSchema.parse({ ...valid, gaps: [{ ...valid.gaps[0], severity: "ΠΟΛΥ_ΚΡΙΣΙΜΟ" }] })).toThrow();
    expect(() => ReasoningSchema.parse({ ...valid, gaps: [{ ...valid.gaps[0], category: "ΑΛΛΟ" }] })).toThrow();
  });

  it("το remedyType επιτρέπεται να λείπει", () => {
    const noRemedy = { ...valid.gaps[0] };
    delete (noRemedy as Partial<typeof noRemedy>).remedyType;
    expect(ReasoningSchema.parse({ ...valid, gaps: [noRemedy] }).gaps[0].remedyType).toBeNull();
  });
});

describe("parseAiJson", () => {
  it("διαβάζει σκέτο JSON", () => {
    expect(parseAiJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("ξετυλίγει code fence", () => {
    expect(parseAiJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseAiJson('```\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("αγνοεί φλυαρία γύρω από το JSON", () => {
    expect(parseAiJson('Ορίστε το αποτέλεσμα:\n{"a":1}\nΕλπίζω να βοηθά.')).toEqual({ a: 1 });
  });

  it("διαβάζει πίνακα στο ανώτατο επίπεδο", () => {
    expect(parseAiJson("[1,2]")).toEqual([1, 2]);
  });

  it("πετά σε κείμενο χωρίς JSON", () => {
    expect(() => parseAiJson("δεν βρήκα τίποτα")).toThrow(/JSON/i);
    expect(() => parseAiJson("")).toThrow(/JSON/i);
  });
});
