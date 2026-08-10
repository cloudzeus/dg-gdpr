import { geminiGenerate, proModel, type GeminiOptions, type GeminiPart } from "@/lib/gemini";
import { ExtractionSchema, parseAiJson, type Extraction } from "./schemas";

/**
 * Στάδιο ⑤: από κείμενο OCR σε δομημένα γεγονότα.
 *
 * Στέλνουμε ΚΑΙ το κείμενο ΚΑΙ το αρχείο: το μοντέλο βλέπει letterhead,
 * σφραγίδες και πεδία υπογραφής που χάνονται στο σκέτο κείμενο, και εκεί
 * κρύβεται συχνά το ποιος πραγματικά υπογράφει.
 */

const BASE_SYSTEM = `Είσαι αναλυτής ελληνικών εμπορικών εγγράφων.
Εξάγεις ΓΕΓΟΝΟΤΑ. ΔΕΝ ερμηνεύεις νομικά, ΔΕΝ αποφασίζεις ρόλους GDPR.
Αν κάτι δεν αναφέρεται στο έγγραφο, βάλε null ή κενό πίνακα — ΜΗΝ το εφευρίσκεις.

Στο «vendors» βάλε ΚΑΘΕ εμπορικό όνομα προϊόντος, μάρκας ή παρόχου που
αναφέρεται. Για καθένα απάντησε ΞΕΧΩΡΙΣΤΑ αν επεξεργάζεται δεδομένα
προσωπικού χαρακτήρα για λογαριασμό κάποιου:
  "PROCESSES_DATA" — cloud, φιλοξενία, SaaS, υπηρεσία που κρατά ή βλέπει δεδομένα
  "SUPPLIES_ONLY"  — εξοπλισμός, υλικό, άδεια λογισμικού on-premise. Δεν αγγίζει δεδομένα.
  "UNCLEAR"        — δεν προκύπτει από το έγγραφο
Στο «evidence» γράψε τη φράση του εγγράφου που στηρίζει την κατάταξη.

Στο «purposes» βάλε ΓΙΑΤΙ γίνεται η επεξεργασία, όχι τι είναι το έργο: π.χ.
«εκτέλεση παραγγελιών», «τεχνική υποστήριξη χρηστών», «τιμολόγηση». Είναι
υποχρεωτικό στοιχείο σύμβασης άρθρου 28 και πρέπει να προκύπτει από το
έγγραφο — αν δεν προκύπτει, άφησέ το κενό.
Ένας κατασκευαστής δρομολογητών ή τηλεφωνικών συσκευών που απλώς πουλάει
υλικό είναι SUPPLIES_ONLY, όχι PROCESSES_DATA.`;

const CONTRACT_BLOCK = `
Το υλικό περιλαμβάνει ΣΥΜΒΑΣΗ. Στο «parties» βάλε ΜΟΝΟ τα συμβαλλόμενα μέρη —
αυτούς που υπογράφουν ή δεσμεύονται νομικά. ΟΧΙ προϊόντα, ΟΧΙ μάρκες, ΟΧΙ
προμηθευτές που απλώς αναφέρονται: αυτά ανήκουν στο «vendors».`;

const NO_CONTRACT_BLOCK = `
Το υλικό ΔΕΝ περιλαμβάνει σύμβαση — είναι προσφορά ή τεχνική περιγραφή.
ΑΦΗΣΕ ΤΟ «parties» ΚΕΝΟ: μια προσφορά δεν θεμελιώνει συμβαλλόμενους.
Στο «recipientHint» βάλε ΜΟΝΟ την επωνυμία του παραλήπτη, αν κατονομάζεται
ρητά (π.χ. «Προς:», «Αποδέκτες:», «Πρόταση για τη ...»).
Δώσε βάρος στο «subject», στο «dataCategories», στο «purposes» και στο «vendors».`;

const JSON_SHAPE = `Επιστρέφεις ΜΟΝΟ JSON με αυτή τη δομή:
{
  "parties": [{ "name": "...", "vat": "...", "address": "...", "representative": "...", "email": "..." }],
  "subject": "...",
  "signedAt": "YYYY-MM-DD",
  "term": "...",
  "dataCategories": ["..."],
  "purposes": ["..."],
  "vendors": [{ "name": "...", "triage": "PROCESSES_DATA|SUPPLIES_ONLY|UNCLEAR", "evidence": "..." }],
  "recipientHint": "...",
  "crossBorderTransfer": false,
  "specialCategories": false,
  "signatories": ["..."]
}
Το "specialCategories" είναι true μόνο αν το έγγραφο αναφέρει δεδομένα άρθρου 9 GDPR.`;

export type DocumentKind = "CONTRACT" | "OFFER" | "ANNEX" | "CORRESPONDENCE" | "OTHER";

export interface ExtractionSource {
  text: string;
  buffer: Buffer;
  mimeType: string;
  kind: DocumentKind;
}

function buildSystemPrompt(sources: ExtractionSource[]): string {
  const kindBlock = sources.some((s) => s.kind === "CONTRACT")
    ? CONTRACT_BLOCK
    : NO_CONTRACT_BLOCK;
  return `${BASE_SYSTEM}\n${kindBlock}\n\n${JSON_SHAPE}`;
}

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Ανώτατο μέγεθος συνημμένων σε ένα αίτημα. Πέρα από αυτό στέλνεται μόνο κείμενο. */
const MAX_INLINE_BYTES = 15 * 1024 * 1024;

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
  const system = buildSystemPrompt(sources);

  const parts: GeminiPart[] = [];
  let inlineBudget = MAX_INLINE_BYTES;

  sources.forEach((s, i) => {
    parts.push({ text: `--- Έγγραφο ${i + 1} (${s.kind}, κείμενο OCR) ---\n${s.text}` });

    // Το DOCX έχει ήδη εξαχθεί σε κείμενο· τα bytes του δεν λένε τίποτα σε
    // μοντέλο όρασης. Και πέρα από το όριο, το κείμενο μόνο του είναι
    // προτιμότερο από ένα αίτημα που θα απορριφθεί ολόκληρο.
    if (s.mimeType === DOCX_MIME) return;
    if (s.buffer.length > inlineBudget) return;

    inlineBudget -= s.buffer.length;
    parts.push({ inlineData: { mimeType: s.mimeType, data: s.buffer.toString("base64") } });
  });

  const attempt = async (temperature: number, extraSystem = "") => {
    const raw = await generate({
      model: proModel(),
      system: system + extraSystem,
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
          "σύμφωνα ακριβώς με τη δομή, χωρίς επιπλέον κείμενο ή σχόλια."
      );
    } catch (e) {
      throw new Error(
        `Η εξαγωγή στοιχείων απέτυχε: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
}
