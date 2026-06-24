import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, processingPurpose, risks, mitigations } = await req.json();
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "DEEPSEEK_API_KEY not configured" }, { status: 500 });

  const systemPrompt = `Είσαι εμπειρογνώμονας GDPR και εκτίμησης κινδύνου (DPIA, Άρθρο 35).
Αξιολογείς τον κίνδυνο για τα δικαιώματα και τις ελευθερίες των φυσικών προσώπων.
Χρησιμοποιείς κλίμακα 1-5 για Πιθανότητα (likelihood) και 1-5 για Επίπτωση (impact):
- Πιθανότητα: 1=Πολύ Απίθανο, 2=Απίθανο, 3=Μέτριο, 4=Πιθανό, 5=Πολύ Πιθανό
- Επίπτωση: 1=Αμελητέα, 2=Μικρή, 3=Μέτρια, 4=Σοβαρή, 5=Πολύ Σοβαρή
Λαμβάνεις υπόψη ότι τα υπάρχοντα μέτρα αντιμετώπισης ΜΕΙΩΝΟΥΝ την πιθανότητα (residual risk).
Επιστρέφεις ΜΟΝΟ έγκυρο JSON χωρίς markdown, χωρίς code blocks, χωρίς εξηγήσεις εκτός του JSON.`;

  const numbered = (arr: unknown) =>
    Array.isArray(arr) && arr.length
      ? arr.map((x: string, i: number) => `${i + 1}. ${x}`).join("\n")
      : "δεν έχουν καταχωρηθεί";
  const mitigList = numbered(mitigations);

  const riskCount = Array.isArray(risks) ? risks.length : 0;
  const userPrompt = `Αξιολόγησε το συνολικό επίπεδο υπολειπόμενου κινδύνου (residual risk) για το παρακάτω DPIA.

Τίτλος: "${title}"
Σκοπός επεξεργασίας: ${processingPurpose || "—"}

Εντοπισμένοι κίνδυνοι (${riskCount}):
${numbered(risks)}

Μέτρα αντιμετώπισης:
${mitigList}

Οδηγίες:
- Λάβε υπόψη ΟΛΟΥΣ τους παραπάνω κινδύνους, όχι μόνο μερικούς.
- Η συνολική Πιθανότητα και Επίπτωση πρέπει να αντικατοπτρίζουν τον ΣΟΒΑΡΟΤΕΡΟ εναπομείναντα κίνδυνο (worst-case), όχι τον μέσο όρο.
- Στην αιτιολόγηση κάλυψε τις βασικές κατηγορίες κινδύνου που εντόπισες (π.χ. ασφάλεια/κρυπτογράφηση, πρόσβαση/ταυτοποίηση, ακεραιότητα/μετεγκατάσταση, ελαχιστοποίηση, δικαιώματα υποκειμένων, λογοδοσία) και εξήγησε πώς τα μέτρα μειώνουν ή όχι την πιθανότητα.

Επίστρεψε ΜΟΝΟ JSON:
{
  "likelihood": <ακέραιος 1-5>,
  "impact": <ακέραιος 1-5>,
  "reasoning": "<ολοκληρωμένη αιτιολόγηση 3-5 προτάσεις στα ελληνικά που καλύπτει το εύρος των κινδύνων>"
}`;

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 900,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err }, { status: response.status });
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content ?? "{}";
    content = content.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start !== -1 && end !== -1) content = content.slice(start, end + 1);
    const parsed = JSON.parse(content);

    // Clamp to valid 1-5 range
    const clamp = (n: unknown) => {
      const v = Math.round(Number(n));
      return Number.isFinite(v) ? Math.min(5, Math.max(1, v)) : null;
    };
    const likelihood = clamp(parsed.likelihood);
    const impact = clamp(parsed.impact);
    if (likelihood === null || impact === null) {
      return NextResponse.json({ error: "Μη έγκυρη απόκριση AI" }, { status: 502 });
    }

    return NextResponse.json({ likelihood, impact, reasoning: parsed.reasoning ?? "" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
