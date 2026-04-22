import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { gaps, overallScore, orgName, hasDpia, hasDpa, hasMapper } = await req.json();
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "DEEPSEEK_API_KEY not configured" }, { status: 500 });

  const systemPrompt = `Είσαι εμπειρογνώμονας GDPR για ελληνικές εταιρείες. Δίνεις ρεαλιστικές, πρακτικές συμβουλές.
Επιστρέφεις ΜΟΝΟ έγκυρο JSON χωρίς markdown, χωρίς code blocks, χωρίς εξηγήσεις.`;

  const gapsText = gaps
    .map((g: any) => `[${g.priority.toUpperCase()}] ${g.category}: ${g.question} → ${g.action}`)
    .join("\n");

  const contextParts: string[] = [];
  if (hasDpia) contextParts.push("υπάρχουν ήδη DPIA αναφορές");
  if (hasDpa) contextParts.push("υπάρχουν συμβάσεις DPA");
  if (hasMapper) contextParts.push("υπάρχει χαρτογράφηση ροών δεδομένων");
  const contextStr = contextParts.length > 0 ? contextParts.join(", ") : "δεν υπάρχουν πρόσθετα δεδομένα";

  const userPrompt = `Εταιρεία: ${orgName || "Άγνωστη"}
Τρέχον επίπεδο συμμόρφωσης: ${overallScore}%
Υπάρχοντα δεδομένα: ${contextStr}

Κενά συμμόρφωσης που εντοπίστηκαν:
${gapsText}

Δημιούργησε ένα ρεαλιστικό σχέδιο δράσης ελάχιστης προσπάθειας (minimum viable compliance) για αυτή την εταιρεία με βάση τα παραπάνω κενά.

Οργάνωσέ το σε 3 φάσεις:
- Φάση 1 (0-30 μέρες): Κρίσιμες ενέργειες που δεν κοστίζουν πόρους
- Φάση 2 (1-3 μήνες): Σημαντικές ενέργειες με μέτρια προσπάθεια
- Φάση 3 (3-6 μήνες): Διαρθρωτικές βελτιώσεις

Για κάθε ενέργεια δώσε: τίτλο, σύντομη περιγραφή, το άρθρο GDPR, και το εκτιμώμενο κόστος (χαμηλό/μέτριο/υψηλό).

Επίστρεψε ΜΟΝΟ JSON:
{
  "summary": "σύντομη εκτίμηση κατάστασης 2-3 προτάσεις",
  "estimatedTimeline": "π.χ. 4-6 μήνες",
  "phases": [
    {
      "phase": 1,
      "title": "Άμεσες Ενέργειες (0-30 μέρες)",
      "items": [
        {
          "title": "...",
          "description": "...",
          "article": "Άρθρο X",
          "effort": "χαμηλό"
        }
      ]
    }
  ]
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
        max_tokens: 3000,
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
