// src/lib/intake/extraction.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractContract } from "./extraction";

const VALID = JSON.stringify({
  parties: [
    { name: "DGSOFT ΕΕ", vat: "997939640" },
    { name: "ΚΟΣΜΟΚΑΡ Α.Ε.", vat: "094059163" },
  ],
  subject: "Ανάπτυξη λογισμικού",
  dataCategories: ["Στοιχεία πελατών"],
});

const docs = [
  { text: "ΣΥΜΒΑΣΗ...", buffer: Buffer.from("f"), mimeType: "application/pdf" },
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
    expect(parts.some((p: any) => p.text?.includes("ΣΥΜΒΑΣΗ"))).toBe(true);
    expect(parts.some((p: any) => p.inlineData?.mimeType === "application/pdf")).toBe(true);
  });

  it("ξεπερνά τα code fences", async () => {
    const generate = vi.fn().mockResolvedValue("```json\n" + VALID + "\n```");
    await expect(extractContract(docs, { generate })).resolves.toMatchObject({
      parties: expect.any(Array),
    });
  });

  it("ξαναπροσπαθεί μία φορά όταν η απάντηση δεν περνά το schema", async () => {
    const generate = vi.fn()
      .mockResolvedValueOnce('{"parties":[]}')
      .mockResolvedValueOnce(VALID);
    const r = await extractContract(docs, { generate });

    expect(generate).toHaveBeenCalledTimes(2);
    expect(r.parties).toHaveLength(2);
    // Η δεύτερη προσπάθεια είναι αυστηρότερη
    expect(generate.mock.calls[1][0].temperature).toBe(0);
  });

  it("πετά όταν αποτύχει και η δεύτερη προσπάθεια", async () => {
    const generate = vi.fn().mockResolvedValue('{"parties":[]}');
    await expect(extractContract(docs, { generate })).rejects.toThrow(/εξαγωγ/i);
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it("πετά όταν δεν δοθεί κανένα έγγραφο", async () => {
    const generate = vi.fn();
    await expect(extractContract([], { generate })).rejects.toThrow(/έγγραφ/i);
    expect(generate).not.toHaveBeenCalled();
  });
});
