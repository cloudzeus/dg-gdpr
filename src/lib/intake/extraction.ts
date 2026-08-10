import { geminiGenerate, proModel, type GeminiOptions, type GeminiPart } from "@/lib/gemini";
import { ExtractionSchema, parseAiJson, type Extraction } from "./schemas";

/**
 * Στάδιο ⑤: από κείμενο OCR σε δομημένα γεγονότα.
 *
 * Στέλνουμε ΚΑΙ το κείμενο ΚΑΙ το αρχείο: το μοντέλο βλέπει letterhead,
 * σφραγίδες και πεδία υπογραφής που χάνονται στο σκέτο κείμενο, και εκεί
 * κρύβεται συχνά το ποιος πραγματικά υπογράφει.
 */

const SYSTEM = `Είσαι αναλυτής ελληνικών εμπορικών συμβάσεων.
Εξάγεις γεγονότα από το έγγραφο. ΔΕΝ ερμηνεύεις νομικά, ΔΕΝ αποφασίζεις ρόλους GDPR.
Αν κάτι δεν αναφέρεται στο έγγραφο, βάλε null ή κενό πίνακα — ΜΗΝ το εφευρίσκεις.
Επιστρέφεις ΜΟΝΟ JSON με αυτή τη δομή:
{
  "parties": [{ "name": "...", "vat": "...", "address": "...", "representative": "...", "email": "..." }],
  "subject": "...",
  "signedAt": "YYYY-MM-DD",
  "term": "...",
  "dataCategories": ["..."],
  "subProcessors": ["..."],
  "crossBorderTransfer": false,
  "specialCategories": false,
  "signatories": ["..."]
}
Στα "parties" βάλε ΚΑΘΕ νομικό πρόσωπο που αναφέρεται ως μέρος, υπεργολάβος ή αποδέκτης.
Το "specialCategories" είναι true μόνο αν το έγγραφο αναφέρει δεδομένα άρθρου 9 GDPR.`;

export interface ExtractionSource {
  text: string;
  buffer: Buffer;
  mimeType: string;
}

export interface ExtractionDeps {
  generate?: (opts: GeminiOptions) => Promise<string>;
}

export async function extractContract(
  sources: ExtractionSource[],
  deps: ExtractionDeps = {}
): Promise<Extraction> {
  if (sources.length === 0) {
    throw new Error("Δεν δόθηκε κανένα έγγραφο προς εξαγωγή");
  }

  const generate = deps.generate ?? geminiGenerate;

  const parts: GeminiPart[] = [];
  sources.forEach((s, i) => {
    parts.push({ text: `--- Έγγραφο ${i + 1} (κείμενο OCR) ---\n${s.text}` });
    parts.push({ inlineData: { mimeType: s.mimeType, data: s.buffer.toString("base64") } });
  });

  const attempt = async (temperature: number, extraSystem = "") => {
    const raw = await generate({
      model: proModel(),
      system: SYSTEM + extraSystem,
      parts,
      json: true,
      temperature,
    });
    return ExtractionSchema.parse(parseAiJson(raw));
  };

  try {
    return await attempt(0.1);
  } catch {
    // Μία δεύτερη προσπάθεια, αυστηρότερη. Αν ξαναποτύχει, ο χρήστης
    // συμπληρώνει με το χέρι — δεν αποθηκεύουμε ποτέ ανεπικύρωτη έξοδο.
    try {
      return await attempt(
        0,
        "\nΠΡΟΣΟΧΗ: η προηγούμενη απάντηση ήταν άκυρη. Επίστρεψε ΜΟΝΟ έγκυρο JSON " +
          "με τουλάχιστον ένα στοιχείο στο parties, το καθένα με μη κενό name."
      );
    } catch (e) {
      throw new Error(
        `Η εξαγωγή στοιχείων απέτυχε: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
}
