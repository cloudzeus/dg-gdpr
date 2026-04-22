import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  // Load organisation data for context
  const org = await prisma.organization.findFirst();
  const orgLines: string[] = [];
  if (org?.name)        orgLines.push(`Επωνυμία: ${org.name}`);
  if (org?.legalName)   orgLines.push(`Νομική επωνυμία: ${org.legalName}`);
  if (org?.vatNumber)   orgLines.push(`ΑΦΜ: ${org.vatNumber}`);
  if (org?.taxOffice)   orgLines.push(`ΔΟΥ: ${org.taxOffice}`);
  if (org?.registryNo)  orgLines.push(`ΓΕΜΗ: ${org.registryNo}`);
  if (org?.addressLine1 || org?.city) {
    const addr = [org.addressLine1, org.postalCode, org.city, org.country].filter(Boolean).join(", ");
    orgLines.push(`Έδρα: ${addr}`);
  }
  if (org?.website)     orgLines.push(`Website: ${org.website}`);
  if (org?.description) orgLines.push(`Δραστηριότητα: ${org.description}`);

  const orgContext = orgLines.length
    ? `\n\nΣτοιχεία εταιρείας:\n${orgLines.join("\n")}`
    : "";

  const systemPrompt = `Είσαι νομικός και τεχνικός σύμβουλος GDPR για ελληνικές εταιρείες.
Γράφεις επίσημα εταιρικά έγγραφα πολιτικής σε επαγγελματικό επίπεδο, στα ελληνικά.
Επιστρέφεις ΜΟΝΟ HTML (χωρίς markdown, χωρίς code blocks, χωρίς εξηγήσεις).
Χρησιμοποίησε tags: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>, <hr>.
Χρησιμοποίησε τα στοιχεία της εταιρείας (όνομα, ΑΦΜ, έδρα κ.λπ.) στο κείμενο της πολιτικής όπου ταιριάζει.`;

  const userPrompt = `Γράψε μια πλήρη και λεπτομερή «${typeName}» για την παρακάτω εταιρεία.${orgContext}

Η πολιτική πρέπει:
- Να αναφέρει ρητά το όνομα και τα στοιχεία της εταιρείας στην κεφαλίδα και όπου αρμόζει
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
