import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deepseekJson } from "@/lib/deepseek";

// POST { fieldKey, labelEl, descriptionEl, isSpecialCategory }
// → { suggestions: [{ basis, rationale: { el, en } }] }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fieldKey, labelEl, descriptionEl, isSpecialCategory } = await req.json();
  if (!labelEl?.trim()) return NextResponse.json({ error: "labelEl is required" }, { status: 400 });

  try {
    const out = await deepseekJson<{ suggestions: Array<{ basis: string; rationale: { el: string; en: string } }> }>({
      system:
        "Είσαι νομικός σύμβουλος GDPR. Επιστρέφεις ΜΟΝΟ JSON: {\"suggestions\":[{\"basis\":\"CONSENT|CONTRACT|LEGAL_OBLIGATION|VITAL_INTEREST|PUBLIC_TASK|LEGITIMATE_INTEREST\",\"rationale\":{\"el\":\"...\",\"en\":\"...\"}}]}. Χωρίς markdown, χωρίς επεξηγήσεις εκτός του JSON.",
      user: `Πεδίο προσωπικών δεδομένων: "${labelEl}" (key: ${fieldKey}).\nΠεριγραφή: ${descriptionEl ?? "—"}.\nΕιδική κατηγορία (Άρθρο 9): ${isSpecialCategory ? "ΝΑΙ" : "ΟΧΙ"}.\nΠρότεινε 1-3 πιθανές νομικές βάσεις επεξεργασίας κατά το Άρθρο 6 GDPR, με σύντομη αιτιολόγηση σε EL και EN.`,
      temperature: 0.3,
      maxTokens: 1024,
    });
    return NextResponse.json({ suggestions: out.suggestions ?? [] });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
