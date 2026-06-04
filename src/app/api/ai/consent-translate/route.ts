import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deepseekJson } from "@/lib/deepseek";

// POST { text: string, from?: "el"|"en", to: "el"|"en" } → { translated: string }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, from, to } = await req.json();
  if (!text?.trim() || !to) {
    return NextResponse.json({ error: "text and to are required" }, { status: 400 });
  }

  const langName = (l: string) => (l === "en" ? "Αγγλικά" : "Ελληνικά");
  try {
    const out = await deepseekJson<{ translated: string }>({
      system:
        "Είσαι επαγγελματίας μεταφραστής νομικών/GDPR κειμένων. Επιστρέφεις ΜΟΝΟ JSON της μορφής {\"translated\":\"...\"} χωρίς επεξηγήσεις.",
      user: `Μετάφρασε το παρακάτω κείμενο ${from ? `από ${langName(from)} ` : ""}στα ${langName(to)}. Διατήρησε νομική ορολογία.\n\nΚείμενο:\n${text}`,
      temperature: 0.2,
    });
    return NextResponse.json({ translated: out.translated ?? "" });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
