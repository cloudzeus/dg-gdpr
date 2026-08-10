// src/lib/gemini.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { geminiGenerate, GeminiError } from "./gemini";

const okBody = (text: string) => ({
  candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }],
});

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

describe("geminiGenerate", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GEMINI_API_KEY;
  });

  it("επιστρέφει το κείμενο της απάντησης", async () => {
    vi.stubGlobal("fetch", mockFetch(200, okBody("γεια")));
    await expect(geminiGenerate({ model: "m", parts: [{ text: "x" }] })).resolves.toBe("γεια");
  });

  it("ενώνει πολλαπλά parts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: "α" }, { text: "β" }] } }] }),
      text: async () => "",
    }));
    await expect(geminiGenerate({ model: "m", parts: [{ text: "x" }] })).resolves.toBe("αβ");
  });

  it("στέλνει το model στο URL και το κλειδί σε header", async () => {
    const f = mockFetch(200, okBody("ok"));
    vi.stubGlobal("fetch", f);
    await geminiGenerate({ model: "gemini-test-pro", parts: [{ text: "x" }] });

    const [url, init] = f.mock.calls[0];
    expect(url).toContain("/models/gemini-test-pro:generateContent");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key");
  });

  it("περνά systemInstruction και ζητά JSON όταν ζητηθεί", async () => {
    const f = mockFetch(200, okBody("{}"));
    vi.stubGlobal("fetch", f);
    await geminiGenerate({ model: "m", system: "είσαι OCR", parts: [{ text: "x" }], json: true });

    const body = JSON.parse((f.mock.calls[0][1] as RequestInit).body as string);
    expect(body.systemInstruction.parts[0].text).toBe("είσαι OCR");
    expect(body.generationConfig.responseMimeType).toBe("application/json");
  });

  it("δεν ζητά JSON όταν δεν ζητηθεί", async () => {
    const f = mockFetch(200, okBody("κείμενο"));
    vi.stubGlobal("fetch", f);
    await geminiGenerate({ model: "m", parts: [{ text: "x" }] });

    const body = JSON.parse((f.mock.calls[0][1] as RequestInit).body as string);
    expect(body.generationConfig.responseMimeType).toBeUndefined();
  });

  it("στέλνει συνημμένο αρχείο ως inlineData", async () => {
    const f = mockFetch(200, okBody("ok"));
    vi.stubGlobal("fetch", f);
    await geminiGenerate({
      model: "m",
      parts: [{ inlineData: { mimeType: "application/pdf", data: "QUJD" } }],
    });

    const body = JSON.parse((f.mock.calls[0][1] as RequestInit).body as string);
    expect(body.contents[0].parts[0].inlineData).toEqual({
      mimeType: "application/pdf",
      data: "QUJD",
    });
  });

  it("πετά GeminiError σε HTTP σφάλμα, με το status", async () => {
    vi.stubGlobal("fetch", mockFetch(429, { error: { message: "rate limited" } }));
    await expect(geminiGenerate({ model: "m", parts: [{ text: "x" }] }))
      .rejects.toMatchObject({ name: "GeminiError", status: 429 });
  });

  it("πετά όταν λείπει το κλειδί", async () => {
    delete process.env.GEMINI_API_KEY;
    vi.stubGlobal("fetch", mockFetch(200, okBody("ok")));
    await expect(geminiGenerate({ model: "m", parts: [{ text: "x" }] }))
      .rejects.toThrow(/GEMINI_API_KEY/);
  });

  it("πετά όταν η απάντηση δεν έχει candidates", async () => {
    vi.stubGlobal("fetch", mockFetch(200, { candidates: [] }));
    await expect(geminiGenerate({ model: "m", parts: [{ text: "x" }] }))
      .rejects.toThrow(GeminiError);
  });

  it("πετά όταν η απάντηση κόπηκε από φίλτρο ασφαλείας", async () => {
    vi.stubGlobal("fetch", mockFetch(200, {
      candidates: [{ content: { parts: [] }, finishReason: "SAFETY" }],
    }));
    await expect(geminiGenerate({ model: "m", parts: [{ text: "x" }] }))
      .rejects.toThrow(/SAFETY/);
  });
});
