// src/lib/intake/extraction.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractContract } from "./extraction";
import type { GeminiPart } from "@/lib/gemini";

const VALID = JSON.stringify({
  parties: [
    { name: "DGSOFT ΕΕ", vat: "997939640" },
    { name: "ΚΟΣΜΟΚΑΡ Α.Ε.", vat: "094059163" },
  ],
  subject: "Ανάπτυξη λογισμικού",
  dataCategories: ["Στοιχεία πελατών"],
});

const docs = [
  { text: "ΣΥΜΒΑΣΗ...", buffer: Buffer.from("f"), mimeType: "application/pdf", kind: "CONTRACT" as const },
];

describe("extractContract", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_MODEL_PRO = "pro";
  });

  it("επιστρέφει επικυρωμένη εξαγωγή", async () => {
    const generate = vi.fn().mockResolvedValue(VALID);
    const r = await extractContract(docs, { generate });

    expect(r.parties).toHaveLength(2);
    expect(r.parties[0].vat).toBe("997939640");
    expect(r.dataCategories).toEqual(["Στοιχεία πελατών"]);
  });

  it("χρησιμοποιεί το pro μοντέλο και ζητά JSON", async () => {
    const generate = vi.fn().mockResolvedValue(VALID);
    await extractContract(docs, { generate });

    expect(generate.mock.calls[0][0].model).toBe("pro");
    expect(generate.mock.calls[0][0].json).toBe(true);
  });

  it("στέλνει και το κείμενο και το αρχείο", async () => {
    const generate = vi.fn().mockResolvedValue(VALID);
    await extractContract(docs, { generate });

    const parts = generate.mock.calls[0][0].parts;
    expect(parts.some((p: GeminiPart) => p.text?.includes("ΣΥΜΒΑΣΗ"))).toBe(true);
    expect(parts.some((p: GeminiPart) => p.inlineData?.mimeType === "application/pdf")).toBe(true);
  });

  it("ξεπερνά τα code fences", async () => {
    const generate = vi.fn().mockResolvedValue("```json\n" + VALID + "\n```");
    await expect(extractContract(docs, { generate })).resolves.toMatchObject({
      parties: expect.any(Array),
    });
  });

  it("ξαναπροσπαθεί μία φορά όταν η απάντηση δεν περνά το schema", async () => {
    // Ένα μέρος χωρίς όνομα είναι άκυρο — parties:[] πλέον είναι έγκυρο.
    const generate = vi.fn()
      .mockResolvedValueOnce('{"parties":[{"name":""}]}')
      .mockResolvedValueOnce(VALID);
    const r = await extractContract(docs, { generate });

    expect(generate).toHaveBeenCalledTimes(2);
    expect(r.parties).toHaveLength(2);
    // Η δεύτερη προσπάθεια είναι αυστηρότερη
    expect(generate.mock.calls[1][0].temperature).toBe(0);
  });

  it("πετά όταν αποτύχει και η δεύτερη προσπάθεια", async () => {
    const generate = vi.fn().mockResolvedValue('{"parties":[{"name":""}]}');
    await expect(extractContract(docs, { generate })).rejects.toThrow(/εξαγωγ/i);
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it("δεν στέλνει bytes DOCX στο μοντέλο όρασης", async () => {
    const generate = vi.fn().mockResolvedValue(VALID);
    await extractContract(
      [{
        text: "ΣΥΜΒΑΣΗ από Word",
        buffer: Buffer.from("docx-bytes"),
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        kind: "CONTRACT",
      }],
      { generate }
    );

    const parts = generate.mock.calls[0][0].parts;
    expect(parts.some((p: GeminiPart) => p.inlineData)).toBe(false);
    expect(parts.some((p: GeminiPart) => p.text?.includes("ΣΥΜΒΑΣΗ από Word"))).toBe(true);
  });

  it("παραλείπει συνημμένα πέρα από το όριο μεγέθους, κρατά το κείμενο", async () => {
    const generate = vi.fn().mockResolvedValue(VALID);
    const huge = {
      text: "τεράστιο",
      buffer: Buffer.alloc(16 * 1024 * 1024),
      mimeType: "application/pdf",
      kind: "CONTRACT" as const,
    };
    await extractContract([huge], { generate });

    const parts = generate.mock.calls[0][0].parts;
    expect(parts.some((p: GeminiPart) => p.inlineData)).toBe(false);
    expect(parts.some((p: GeminiPart) => p.text?.includes("τεράστιο"))).toBe(true);
  });

  it("πετά όταν δεν δοθεί κανένα έγγραφο", async () => {
    const generate = vi.fn();
    await expect(extractContract([], { generate })).rejects.toThrow(/έγγραφ/i);
    expect(generate).not.toHaveBeenCalled();
  });

  it("το prompt ζητά μέρη όταν το υλικό περιλαμβάνει σύμβαση", async () => {
    const generate = vi.fn().mockResolvedValue(VALID);
    await extractContract(docs, { generate });

    const system = generate.mock.calls[0][0].system;
    expect(system).toContain("parties");
    expect(system).toMatch(/ΜΟΝΟ τα συμβαλλόμενα μέρη/);
  });

  it("το prompt απαγορεύει ρητά τα μέρη όταν δεν υπάρχει σύμβαση", async () => {
    const generate = vi.fn().mockResolvedValue(VALID);
    const offer = [
      { text: "ΠΡΟΣΦΟΡΑ...", buffer: Buffer.from("f"), mimeType: "application/pdf", kind: "OFFER" as const },
    ];
    await extractContract(offer, { generate });

    const system = generate.mock.calls[0][0].system;
    expect(system).toContain("ΑΦΗΣΕ ΤΟ «parties» ΚΕΝΟ");
  });
});
