import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, processingPurpose } = await req.json();
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "DEEPSEEK_API_KEY not configured" }, { status: 500 });

  const systemPrompt = `Είσαι εμπειρογνώμονας GDPR για ελληνικές εταιρείες λογισμικού και ERP integrators.
Επιστρέφεις ΜΟΝΟ έγκυρο JSON χωρίς markdown, χωρίς code blocks, χωρίς εξηγήσεις.`;

  const userPrompt = `Για το DPIA με τίτλο "${title}"${processingPurpose ? ` και σκοπό επεξεργασίας: "${processingPurpose}"` : ""}, πρότεινε:

1. Εντοπισμένοι κίνδυνοι GDPR — 6-8 συγκεκριμένοι κίνδυνοι για τα δικαιώματα και τις ελευθερίες των υποκειμένων (μία σύντομη πρόταση ο καθένας).
2. Μέτρα αντιμετώπισης — ένα αντίστοιχο μέτρο για κάθε κίνδυνο, στην ΙΔΙΑ σειρά (μία σύντομη πρόταση το καθένα).

Επίστρεψε ΜΟΝΟ JSON:
{
  "risks": ["...", "..."],
  "mitigations": ["...", "..."]
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
        temperature: 0.4,
        max_tokens: 1500,
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

    const risks = Array.isArray(parsed.risks) ? parsed.risks.filter((x: unknown) => typeof x === "string") : [];
    const mitigations = Array.isArray(parsed.mitigations) ? parsed.mitigations.filter((x: unknown) => typeof x === "string") : [];
    return NextResponse.json({ risks, mitigations });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
