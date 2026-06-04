import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deepseekJson } from "@/lib/deepseek";

const VALID_BASES = ["CONSENT", "CONTRACT", "LEGAL_OBLIGATION", "VITAL_INTEREST", "PUBLIC_TASK", "LEGITIMATE_INTEREST"] as const;

// Coerce whatever the model returns (sometimes prose, sometimes lowercase) into a valid enum code.
function normalizeBasis(raw: unknown): (typeof VALID_BASES)[number] {
  const s = String(raw ?? "").toUpperCase();
  const exact = VALID_BASES.find((b) => s.includes(b));
  if (exact) return exact;
  if (/(ΣΥΓΚΑΤΑΘ|ΣΥΝΑΙΝ|CONSENT)/.test(s)) return "CONSENT";
  if (/(ΣΥΜΒΑΣ|CONTRACT)/.test(s)) return "CONTRACT";
  if (/(ΝΟΜΙΚ|ΥΠΟΧΡΕΩΣ|OBLIGATION|LEGAL)/.test(s)) return "LEGAL_OBLIGATION";
  if (/(ΖΩΤΙΚ|VITAL)/.test(s)) return "VITAL_INTEREST";
  if (/(ΔΗΜΟΣΙ|PUBLIC)/.test(s)) return "PUBLIC_TASK";
  if (/(ΕΝΝΟΜ|ΣΥΜΦΕΡ|LEGITIMATE)/.test(s)) return "LEGITIMATE_INTEREST";
  return "CONSENT";
}

// POST { fieldKey, labelEl, descriptionEl, isSpecialCategory }
// → { suggestions: [{ basis (enum), rationale: { el, en } }] }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fieldKey, labelEl, descriptionEl, isSpecialCategory } = await req.json();
  if (!labelEl?.trim()) return NextResponse.json({ error: "labelEl is required" }, { status: 400 });

  try {
    const out = await deepseekJson<{ suggestions: Array<{ basis: string; rationale: { el: string; en: string } }> }>({
      system:
        "Είσαι νομικός σύμβουλος GDPR. Το πεδίο \"basis\" ΠΡΕΠΕΙ να είναι ΑΚΡΙΒΩΣ ένας από τους κωδικούς: CONSENT, CONTRACT, LEGAL_OBLIGATION, VITAL_INTEREST, PUBLIC_TASK, LEGITIMATE_INTEREST (όχι περιγραφή). Επιστρέφεις ΜΟΝΟ JSON: {\"suggestions\":[{\"basis\":\"CONSENT\",\"rationale\":{\"el\":\"...\",\"en\":\"...\"}}]}. Χωρίς markdown, χωρίς επεξηγήσεις εκτός του JSON.",
      user: `Πεδίο προσωπικών δεδομένων: "${labelEl}" (key: ${fieldKey}).\nΠεριγραφή: ${descriptionEl ?? "—"}.\nΕιδική κατηγορία (Άρθρο 9): ${isSpecialCategory ? "ΝΑΙ" : "ΟΧΙ"}.\nΠρότεινε 1-3 πιθανές νομικές βάσεις επεξεργασίας κατά το Άρθρο 6 GDPR, με σύντομη αιτιολόγηση σε EL και EN. Θυμήσου: το basis είναι κωδικός enum, όχι πρόταση.`,
      temperature: 0.2,
      maxTokens: 1024,
    });
    const suggestions = (out.suggestions ?? []).map((s) => ({
      basis: normalizeBasis(s.basis),
      rationale: { el: s.rationale?.el ?? "", en: s.rationale?.en ?? "" },
    }));
    return NextResponse.json({ suggestions });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
