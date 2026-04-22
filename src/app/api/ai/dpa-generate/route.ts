import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectName, projectDescription, controllerName, processorName } = await req.json();
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "DEEPSEEK_API_KEY not configured" }, { status: 500 });

  const systemPrompt = `Είσαι νομικός σύμβουλος GDPR για ελληνικές εταιρείες λογισμικού και ERP integrators.
Επιστρέφεις ΜΟΝΟ έγκυρο JSON χωρίς markdown, χωρίς code blocks, χωρίς εξηγήσεις.`;

  const userPrompt = `Για τη Σύμβαση Επεξεργασίας Δεδομένων (DPA — GDPR Άρθρο 28) μεταξύ:
- Υπεύθυνος Επεξεργασίας (Controller): ${controllerName || "πελάτης"}
- Εκτελών Επεξεργασία (Processor): ${processorName || "εταιρεία λογισμικού"}
- Έργο: ${projectName}${projectDescription ? ` — ${projectDescription}` : ""}

Πρότεινε:
1. Κατηγορίες δεδομένων που θα επεξεργαστεί ο Εκτελών (5-8, συγκεκριμένες, GDPR-compliant)
2. Σκοποί επεξεργασίας (4-6 σκοποί, ένας ανά στοιχείο)
3. Τεχνικά & οργανωτικά μέτρα ασφαλείας (1 παράγραφος, επαγγελματικά, GDPR Άρθρο 32)
4. Πιθανοί υποεκτελούντες (0-3, π.χ. cloud providers, εργαλεία ανάπτυξης)
5. Προτεινόμενος χρόνος διατήρησης δεδομένων

Επίστρεψε ΜΟΝΟ JSON:
{
  "dataCategories": ["...", "..."],
  "purposes": ["...", "..."],
  "safeguards": "...",
  "subProcessors": ["...", "..."],
  "retentionPeriod": "..."
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
        temperature: 0.35,
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
    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
