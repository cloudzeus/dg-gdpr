import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectName, projectDescription } = await req.json();
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "DEEPSEEK_API_KEY not configured" }, { status: 500 });

  const systemPrompt = `Είσαι εμπειρογνώμονας GDPR για ελληνικές εταιρείες λογισμικού και ERP integrators.
Επιστρέφεις ΜΟΝΟ έγκυρο JSON χωρίς markdown, χωρίς code blocks, χωρίς εξηγήσεις.`;

  const userPrompt = `Για έργο ανάπτυξης λογισμικού με τίτλο "${projectName}"${projectDescription ? ` και περιγραφή: "${projectDescription}"` : ""}, δημιούργησε:

1. Επαγγελματική περιγραφή σκοπού επεξεργασίας δεδομένων για DPIA (GDPR Άρθρο 35) — 2 παράγραφοι, στα ελληνικά. Να συμπεριλαμβάνει: σκοπό επεξεργασίας, κατηγορίες υποκειμένων, νομική βάση.
2. Αντικείμενα δεδομένων που επεξεργάζεται το σύστημα (κατηγορίες δεδομένων, οντότητες, πηγές) — 5-8 στοιχεία.
3. Προτεινόμενοι κίνδυνοι GDPR για αυτό το έργο — 5-7 κίνδυνοι σχετικοί με το project.

Επίστρεψε ΜΟΝΟ JSON:
{
  "processingPurpose": "...",
  "dataObjects": ["...", "..."],
  "suggestedRisks": ["...", "..."]
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
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err }, { status: response.status });
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content ?? "{}";
    // Strip markdown code fences
    content = content.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
    // Extract only the JSON object (first { to last })
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start !== -1 && end !== -1) content = content.slice(start, end + 1);
    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
