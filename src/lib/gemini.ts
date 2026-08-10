// src/lib/gemini.ts

/**
 * Πελάτης Gemini REST — μόνο `fetch`, όπως και το `lib/deepseek.ts`.
 *
 * Στον αγωγό πρόσληψης το Gemini είναι τα ΜΑΤΙΑ: διαβάζει σκαναρισμένα PDF και
 * φωτογραφίες. Η νομική κρίση ανήκει στο DeepSeek. Τα model IDs έρχονται από
 * env ώστε να αλλάζουν χωρίς deploy.
 */

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export class GeminiError extends Error {
  readonly name = "GeminiError";
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

export interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

export interface GeminiOptions {
  model: string;
  parts: GeminiPart[];
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** Ζητά `application/json` — χρησιμοποίησέ το μαζί με Zod, όχι αντί αυτού. */
  json?: boolean;
}

/**
 * Το μοντέλο για OCR ανά σελίδα — φθηνό και γρήγορο.
 *
 * Η προεπιλογή είναι μετρημένη, όχι υποθετική: σε υποβαθμισμένη φωτογραφία
 * ελληνικής σύμβασης (στραβή, 850px, JPEG q28) το gemini-2.5-flash-lite
 * παρέλειψε σιωπηλά την επωνυμία «DGSOFT» και τη ΔΟΥ, ενώ το 3.5-flash-lite
 * τα διάβασε σωστά. Και τα δύο πέρασαν καθαρό render.
 */
export function liteModel(): string {
  return process.env.GEMINI_MODEL_LITE ?? "gemini-3.5-flash-lite";
}

/** Το μοντέλο για κλιμάκωση και δομημένη εξαγωγή. */
export function proModel(): string {
  return process.env.GEMINI_MODEL_PRO ?? "gemini-2.5-pro";
}

export async function geminiGenerate(opts: GeminiOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError("GEMINI_API_KEY not configured");

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: opts.parts }],
    generationConfig: {
      temperature: opts.temperature ?? 0.1,
      maxOutputTokens: opts.maxOutputTokens ?? 8192,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (opts.system) {
    body.systemInstruction = { parts: [{ text: opts.system }] };
  }

  const res = await fetch(`${BASE_URL}/${opts.model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new GeminiError(`Gemini ${res.status}: ${detail.slice(0, 500)}`, res.status);
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];
  if (!candidate) throw new GeminiError("Gemini: κενή απάντηση χωρίς candidates");

  const text: string = (candidate.content?.parts ?? [])
    .map((p: GeminiPart) => p.text ?? "")
    .join("");

  if (!text) {
    throw new GeminiError(
      `Gemini: καμία έξοδος (finishReason: ${candidate.finishReason ?? "άγνωστο"})`
    );
  }

  return text;
}
