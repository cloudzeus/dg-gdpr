// src/lib/intake/ocr.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readDocument, estimatePageCount } from "./ocr";
import type { GeminiPart } from "@/lib/gemini";

const GOOD_TEXT = `
ΣΥΜΒΑΣΗ ΠΑΡΟΧΗΣ ΥΠΗΡΕΣΙΩΝ. Στην Αθήνα σήμερα, ΜΕΤΑΞΥ της DGSOFT ΕΕ με
ΑΦΜ 997939640 και της ΚΟΣΜΟΚΑΡ Α.Ε. με ΑΦΜ 094059163, συμφωνήθηκαν τα
ακόλουθα σχετικά με την επεξεργασία δεδομένων προσωπικού χαρακτήρα
σύμφωνα με τον Γενικό Κανονισμό 2016/679 και τα άρθρα αυτού.
`;
const JUNK = "�����".repeat(20);

const pdf = { buffer: Buffer.from("fake"), mimeType: "application/pdf", pageCount: 1 };

describe("readDocument", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_MODEL_LITE = "lite";
    process.env.GEMINI_MODEL_PRO = "pro";
  });
  afterEach(() => vi.restoreAllMocks());

  it("διαβάζει με το lite μοντέλο όταν η ποιότητα είναι καλή", async () => {
    const generate = vi.fn().mockResolvedValue(GOOD_TEXT);
    const r = await readDocument(pdf, { generate });

    expect(r.text).toBe(GOOD_TEXT);
    expect(r.model).toBe("lite");
    expect(r.escalated).toBe(false);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("κλιμακώνει στο pro όταν η ποιότητα είναι κακή", async () => {
    const generate = vi.fn()
      .mockResolvedValueOnce(JUNK)
      .mockResolvedValueOnce(GOOD_TEXT);
    const r = await readDocument(pdf, { generate });

    expect(r.text).toBe(GOOD_TEXT);
    expect(r.model).toBe("pro");
    expect(r.escalated).toBe(true);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[0][0].model).toBe("lite");
    expect(generate.mock.calls[1][0].model).toBe("pro");
  });

  it("κρατά την καλύτερη από τις δύο αναγνώσεις αν το pro βγει χειρότερο", async () => {
    const mediocre = GOOD_TEXT.slice(0, 100);
    const generate = vi.fn()
      .mockResolvedValueOnce(mediocre)
      .mockResolvedValueOnce(JUNK);
    const r = await readDocument(pdf, { generate });

    expect(r.text).toBe(mediocre);
    expect(r.escalated).toBe(true);
  });

  it("δεν κλιμακώνει όταν οι κλιμακώσεις έχουν εξαντληθεί", async () => {
    const generate = vi.fn().mockResolvedValue(JUNK);
    const r = await readDocument(pdf, { generate, reserveEscalation: async () => false });

    expect(generate).toHaveBeenCalledTimes(1);
    expect(r.escalated).toBe(false);
    expect(r.model).toBe("lite");
  });

  it("δεν κλιμακώνει όταν η δέσμευση απορριφθεί", async () => {
    const generate = vi.fn().mockResolvedValue(JUNK);
    const reserveEscalation = vi.fn().mockResolvedValue(false);
    const r = await readDocument(pdf, { generate, reserveEscalation });

    expect(reserveEscalation).toHaveBeenCalledTimes(1);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(r.escalated).toBe(false);
    expect(r.model).toBe("lite");
  });

  it("δεν ζητά δέσμευση όταν η πρώτη ανάγνωση είναι καλή", async () => {
    const generate = vi.fn().mockResolvedValue(GOOD_TEXT);
    const reserveEscalation = vi.fn().mockResolvedValue(true);
    await readDocument(pdf, { generate, reserveEscalation });

    expect(reserveEscalation).not.toHaveBeenCalled();
  });

  it("στέλνει το αρχείο ως base64 inlineData", async () => {
    const generate = vi.fn().mockResolvedValue(GOOD_TEXT);
    await readDocument(pdf, { generate });

    const part = generate.mock.calls[0][0].parts.find((p: GeminiPart) => p.inlineData);
    expect(part.inlineData.mimeType).toBe("application/pdf");
    expect(part.inlineData.data).toBe(Buffer.from("fake").toString("base64"));
  });

  it("για DOCX δεν καλεί καθόλου το Gemini", async () => {
    const generate = vi.fn();
    const r = await readDocument(
      {
        buffer: Buffer.from("x"),
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        pageCount: null,
      },
      { generate, extractDocx: async () => GOOD_TEXT }
    );

    expect(generate).not.toHaveBeenCalled();
    expect(r.model).toBe("docx");
    expect(r.text).toBe(GOOD_TEXT);
    // Δεν υπήρξε ανάγνωση OCR να αποτύχει — το DOCX δεν βαθμολογείται πια
    // από την πύλη ποιότητας, βαθμολογείται ως τέλειο.
    expect(r.quality).toBe(1);
  });

  it("υπολογίζει σελίδες PDF από το /Count του page tree", () => {
    const buf = Buffer.from("%PDF-1.7\n1 0 obj<</Type /Pages /Kids[...] /Count 12>>endobj", "latin1");
    expect(estimatePageCount(buf, "application/pdf")).toBe(12);
  });

  it("πέφτει πίσω στην καταμέτρηση /Type /Page όταν λείπει το /Count", () => {
    const buf = Buffer.from("%PDF\n<</Type /Page >>\n<</Type /Page >>\n<</Type /Page >>", "latin1");
    expect(estimatePageCount(buf, "application/pdf")).toBe(3);
  });

  it("δεν μπερδεύει το /Type /Pages με σελίδα", () => {
    const buf = Buffer.from("%PDF\n<</Type /Pages>>", "latin1");
    expect(estimatePageCount(buf, "application/pdf")).toBeNull();
  });

  it("κάθε εικόνα είναι μία σελίδα", () => {
    expect(estimatePageCount(Buffer.from("x"), "image/jpeg")).toBe(1);
    expect(estimatePageCount(Buffer.from("x"), "image/png")).toBe(1);
  });

  it("για DOCX δεν υπολογίζει σελίδες", () => {
    expect(estimatePageCount(Buffer.from("x"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBeNull();
  });

  it("αφήνει το σφάλμα του Gemini να ανέβει", async () => {
    const generate = vi.fn().mockRejectedValue(new Error("Gemini 500"));
    await expect(readDocument(pdf, { generate })).rejects.toThrow("Gemini 500");
  });
});
