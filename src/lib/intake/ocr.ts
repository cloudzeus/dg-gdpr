import { geminiGenerate, liteModel, proModel, type GeminiOptions } from "@/lib/gemini";
import { scoreOcrText, needsEscalation, DEFAULT_QUALITY_THRESHOLD } from "./quality-gate";

/**
 * Στάδια ③④: μετατροπή ενός εγγράφου σε καθαρό κείμενο, με κλιμάκωση σε
 * ισχυρότερο μοντέλο όταν η πρώτη ανάγνωση βγει κακή.
 *
 * Οι εξαρτήσεις περνούν ως παράμετροι ώστε οι δοκιμές να τρέχουν χωρίς δίκτυο.
 */

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const OCR_SYSTEM = `Είσαι μηχανή OCR για ελληνικά νομικά έγγραφα.
Επίστρεψε ΜΟΝΟ το κείμενο του εγγράφου σε markdown, διατηρώντας επικεφαλίδες,
παραγράφους και πίνακες. Μη σχολιάζεις, μη συνοψίζεις, μη μεταφράζεις.
Διατήρησε ακριβώς αριθμούς, ΑΦΜ, ημερομηνίες και επωνυμίες.
Αν μια λέξη είναι δυσανάγνωστη, γράψε την όπως τη βλέπεις χωρίς να μαντέψεις.`;

/**
 * Πόσες σελίδες έχει το αρχείο. Κρίσιμο για την πύλη ποιότητας: χωρίς αυτό,
 * μια 40σέλιδη σύμβαση που διαβάστηκε ως 300 χαρακτήρες θα περνούσε ως καθαρή.
 * `null` όταν δεν προκύπτει με βεβαιότητα — ο βαθμολογητής τότε υποθέτει μία.
 */
export function estimatePageCount(buffer: Buffer, mimeType: string): number | null {
  if (mimeType.startsWith("image/")) return 1;
  if (mimeType !== "application/pdf") return null;

  const raw = buffer.toString("latin1");

  // Το /Count του page tree είναι το αξιόπιστο σήμα όταν υπάρχει ακέραιο.
  const counts = [...raw.matchAll(/\/Type\s*\/Pages[\s\S]{0,300}?\/Count\s+(\d+)/g)]
    .map((m) => Number(m[1]))
    .filter((n) => n > 0);
  if (counts.length > 0) return Math.max(...counts);

  // Αλλιώς μετράμε αντικείμενα σελίδας. Το αρνητικό lookahead αποκλείει το
  // «/Type /Pages», που είναι ο κόμβος του δέντρου και όχι σελίδα.
  const pages = (raw.match(/\/Type\s*\/Page(?![s])/g) ?? []).length;
  return pages > 0 ? pages : null;
}

export interface SourceDocument {
  buffer: Buffer;
  mimeType: string;
  pageCount: number | null;
  /** Είδος εγγράφου — αλλάζει το λεξιλόγιο που ψάχνει η πύλη ποιότητας. */
  kind?: "CONTRACT" | "OFFER" | "ANNEX" | "CORRESPONDENCE" | "OTHER";
}

export interface ReadResult {
  text: string;
  model: string;
  quality: number;
  escalated: boolean;
}

export interface ReadDeps {
  generate?: (opts: GeminiOptions) => Promise<string>;
  extractDocx?: (buffer: Buffer) => Promise<string>;
  /**
   * Ζητά άδεια για κλιμάκωση τη στιγμή που χρειάζεται, αντί να δεχθεί έναν
   * αριθμό που είναι ήδη παλιός μόλις διαβαστεί. Ο καλών κατέχει τη βάση και
   * απαντά ατομικά — τα έγγραφα διαβάζονται παράλληλα.
   * Αν παραλειφθεί, η κλιμάκωση επιτρέπεται πάντα (χρήσιμο σε δοκιμές).
   */
  reserveEscalation?: () => Promise<boolean>;
  threshold?: number;
}

async function defaultExtractDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

export async function readDocument(
  doc: SourceDocument,
  deps: ReadDeps = {}
): Promise<ReadResult> {
  const generate = deps.generate ?? geminiGenerate;
  const extractDocx = deps.extractDocx ?? defaultExtractDocx;
  const threshold =
    deps.threshold ??
    Number(process.env.INTAKE_OCR_QUALITY_THRESHOLD ?? DEFAULT_QUALITY_THRESHOLD);

  // Το DOCX έχει ήδη κείμενο — το OCR θα ήταν σπατάλη και χειρότερο αποτέλεσμα.
  // Δεν υπήρξε ανάγνωση εδώ, άρα δεν υπάρχει ανάγνωση να αποτύχει: η πύλη
  // ποιότητας βαθμολογεί ΑΝΑΓΝΩΣΙΜΟΤΗΤΑ OCR, όχι πληρότητα περιεχομένου, και
  // η εφαρμογή της σε mammoth-εξαγμένο κείμενο έριχνε τέλεια DOCX κάτω από
  // το κατώφλι κλιμάκωσης επειδή τους έλειπε το λεξιλόγιο σύμβασης.
  if (doc.mimeType === DOCX_MIME) {
    const text = await extractDocx(doc.buffer);
    return {
      text,
      model: "docx",
      quality: 1,
      escalated: false,
    };
  }

  const parts = [
    { text: "Μετέτρεψε αυτό το έγγραφο σε κείμενο." },
    { inlineData: { mimeType: doc.mimeType, data: doc.buffer.toString("base64") } },
  ];

  const first = await generate({ model: liteModel(), system: OCR_SYSTEM, parts });
  const firstQuality = scoreOcrText(first, doc.pageCount, doc.kind);

  if (!needsEscalation(firstQuality, threshold)) {
    return { text: first, model: liteModel(), quality: firstQuality, escalated: false };
  }

  const mayEscalate = deps.reserveEscalation ? await deps.reserveEscalation() : true;
  if (!mayEscalate) {
    return { text: first, model: liteModel(), quality: firstQuality, escalated: false };
  }

  const second = await generate({ model: proModel(), system: OCR_SYSTEM, parts });
  const secondQuality = scoreOcrText(second, doc.pageCount, doc.kind);

  // Η κλιμάκωση δεν εγγυάται βελτίωση — κρατάμε την καλύτερη ανάγνωση.
  return secondQuality >= firstQuality
    ? { text: second, model: proModel(), quality: secondQuality, escalated: true }
    : { text: first, model: liteModel(), quality: firstQuality, escalated: true };
}
