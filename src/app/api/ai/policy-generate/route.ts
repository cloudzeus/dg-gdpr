import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const POLICY_LABELS: Record<string, string> = {
  SECURITY_POLICY: "Πολιτική Ασφάλειας Πληροφοριών",
  ACCEPTABLE_USE: "Πολιτική Αποδεκτής Χρήσης",
  DATA_RETENTION: "Πολιτική Διατήρησης Δεδομένων",
  INCIDENT_RESPONSE: "Πολιτική Αντιμετώπισης Περιστατικών",
  BYOD: "Πολιτική BYOD (Bring Your Own Device)",
  PASSWORD_POLICY: "Πολιτική Κωδικών Πρόσβασης",
  BACKUP: "Πολιτική Αντιγράφων Ασφαλείας",
  ACCESS_CONTROL: "Πολιτική Ελέγχου Πρόσβασης",
  PRIVACY_NOTICE: "Ενημέρωση Απορρήτου (Privacy Notice)",
  COOKIE_POLICY: "Πολιτική Cookies",
  DATA_BREACH: "Πολιτική Παραβίασης Δεδομένων",
  EMPLOYEE_HANDBOOK: "Εγχειρίδιο Εργαζομένων",
  ETHICS_CODE: "Κώδικας Δεοντολογίας",
  CLEAR_DESK: "Πολιτική Τακτοποιημένου Χώρου Εργασίας",
  REMOTE_WORK: "Πολιτική Τηλεργασίας",
  VENDOR_MANAGEMENT: "Πολιτική Διαχείρισης Προμηθευτών",
  CHANGE_MANAGEMENT: "Πολιτική Διαχείρισης Αλλαγών",
  BUSINESS_CONTINUITY: "Πολιτική Επιχειρησιακής Συνέχειας",
  OTHER: "Πολιτική",
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { policyType, policyTitle } = await req.json();
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "DEEPSEEK_API_KEY not configured" }, { status: 500 });

  const typeName = POLICY_LABELS[policyType] ?? policyTitle ?? "Πολιτική";

  const systemPrompt = `Είσαι νομικός και τεχνικός σύμβουλος GDPR για ελληνικές εταιρείες.
Γράφεις επίσημα εταιρικά έγγραφα πολιτικής σε επαγγελματικό επίπεδο, στα ελληνικά.
Επιστρέφεις ΜΟΝΟ HTML (χωρίς markdown, χωρίς code blocks, χωρίς εξηγήσεις).
Χρησιμοποίησε tags: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>, <hr>.`;

  const userPrompt = `Γράψε μια πλήρη και λεπτομερή «${typeName}» για ελληνική εταιρεία.

Η πολιτική πρέπει:
- Να είναι συμμορφωμένη με τον GDPR και την ελληνική νομοθεσία
- Να περιλαμβάνει: Σκοπό, Πεδίο Εφαρμογής, Ορισμούς, Βασικές Αρχές/Κανόνες, Υποχρεώσεις, Παραβιάσεις & Συνέπειες, Αναθεώρηση Πολιτικής
- Να χρησιμοποιεί επαγγελματική γλώσσα κατάλληλη για εταιρικό έγγραφο
- Να αναφέρει σχετικά άρθρα GDPR όπου είναι εφαρμόσιμο

Επίστρεψε ΜΟΝΟ το HTML του περιεχομένου, χωρίς άλλο κείμενο.`;

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
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err }, { status: response.status });
    }

    const data = await response.json();
    const html = data.choices?.[0]?.message?.content ?? "";
    // Strip any accidental markdown code fences
    const clean = html.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "").trim();
    return NextResponse.json({ html: clean });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
