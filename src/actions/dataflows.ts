"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAction } from "@/lib/action-logger";
import { revalidatePath } from "next/cache";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface DataEntry {
  id: string;
  category: string;
  dataTypes: string[];
  legalBasis: string;
  retention: string;
  destinations: string[];
  riskLevel: RiskLevel;
  externalTransfer: boolean;
  transferCountries?: string[];
  transferMechanism?: string;
  notes?: string;
  dpiaId?: string;
}

export interface DepartmentFlowData {
  id: string;
  department: string;
  icon: string;
  entries: DataEntry[];
}

const DEFAULT_FLOWS: Omit<DepartmentFlowData, "id">[] = [
  {
    department: "Ανθρώπινο Δυναμικό",
    icon: "👥",
    entries: [
      {
        id: "hr-1",
        category: "Στοιχεία Εργαζομένων",
        dataTypes: ["Ονοματεπώνυμο", "ΑΦΜ", "ΑΜΚΑ", "Διεύθυνση", "Τηλέφωνο", "Email"],
        legalBasis: "Σύμβαση εργασίας (Άρθ. 6(1)(β))",
        retention: "5 χρόνια μετά αποχώρηση",
        destinations: ["SoftOne ERP", "Λογιστήριο", "Ασφαλιστικός Φορέας"],
        riskLevel: "HIGH",
        externalTransfer: true,
        notes: "Κοινοποίηση στον ΕΦΚΑ για εισφορές",
      },
      {
        id: "hr-2",
        category: "Βιογραφικά Υποψηφίων",
        dataTypes: ["Ονοματεπώνυμο", "Email", "Εκπαίδευση", "Προϋπηρεσία"],
        legalBasis: "Συγκατάθεση (Άρθ. 6(1)(α))",
        retention: "6 μήνες",
        destinations: ["Σύστημα Πρόσληψης"],
        riskLevel: "MEDIUM",
        externalTransfer: false,
      },
    ],
  },
  {
    department: "Πωλήσεις & CRM",
    icon: "📊",
    entries: [
      {
        id: "sales-1",
        category: "Στοιχεία Πελατών",
        dataTypes: ["Επωνυμία", "ΑΦΜ", "Ονοματεπώνυμο Επαφής", "Email", "Τηλέφωνο"],
        legalBasis: "Σύμβαση (Άρθ. 6(1)(β))",
        retention: "10 χρόνια (φορολογική υποχρέωση)",
        destinations: ["SoftOne ERP", "CRM", "Λογιστήριο"],
        riskLevel: "MEDIUM",
        externalTransfer: false,
      },
      {
        id: "sales-2",
        category: "Δυνητικοί Πελάτες (Leads)",
        dataTypes: ["Ονοματεπώνυμο", "Email", "Εταιρεία", "Τηλέφωνο"],
        legalBasis: "Έννομο συμφέρον (Άρθ. 6(1)(στ))",
        retention: "2 χρόνια",
        destinations: ["CRM", "Email Marketing"],
        riskLevel: "LOW",
        externalTransfer: false,
      },
    ],
  },
  {
    department: "Τεχνολογία & Ανάπτυξη",
    icon: "💻",
    entries: [
      {
        id: "it-1",
        category: "Logs & Monitoring",
        dataTypes: ["IP Address", "User ID", "Ενέργειες χρήστη", "Timestamps"],
        legalBasis: "Έννομο συμφέρον - ασφάλεια (Άρθ. 6(1)(στ))",
        retention: "90 ημέρες",
        destinations: ["SIEM", "Log Management Server"],
        riskLevel: "MEDIUM",
        externalTransfer: false,
      },
      {
        id: "it-2",
        category: "Δεδομένα Δοκιμών (Test Data)",
        dataTypes: ["Ανωνυμοποιημένα δεδομένα πελατών"],
        legalBasis: "Έννομο συμφέρον (Άρθ. 6(1)(στ))",
        retention: "Διάρκεια project",
        destinations: ["Dev Environment", "Staging Server"],
        riskLevel: "HIGH",
        externalTransfer: false,
        notes: "Υποχρεωτική ανωνυμοποίηση πριν χρήση σε test",
      },
    ],
  },
  {
    department: "VoIP & Υποστήριξη",
    icon: "📞",
    entries: [
      {
        id: "voip-1",
        category: "Ηχογραφήσεις Κλήσεων",
        dataTypes: ["Φωνή", "Αριθμός τηλεφώνου", "Διάρκεια κλήσης", "Ημερομηνία/Ώρα"],
        legalBasis: "Συγκατάθεση / Έννομο συμφέρον (Άρθ. 6(1)(α)/(στ))",
        retention: "90 ημέρες",
        destinations: ["VoIP Provider", "NAS Storage"],
        riskLevel: "HIGH",
        externalTransfer: true,
        notes: "Ειδοποίηση καλούντος υποχρεωτική πριν εγγραφή",
      },
      {
        id: "voip-2",
        category: "Metadata Κλήσεων",
        dataTypes: ["Αριθμός τηλεφώνου", "Διάρκεια", "Κατεύθυνση κλήσης"],
        legalBasis: "Έννομο συμφέρον (Άρθ. 6(1)(στ))",
        retention: "12 μήνες",
        destinations: ["SoftOne ERP", "CRM"],
        riskLevel: "MEDIUM",
        externalTransfer: false,
      },
    ],
  },
  {
    department: "Λογιστήριο & Οικονομικά",
    icon: "💰",
    entries: [
      {
        id: "fin-1",
        category: "Φορολογικά Στοιχεία",
        dataTypes: ["ΑΦΜ", "Τραπεζικός Λογαριασμός", "Τιμολόγια", "Παραστατικά"],
        legalBasis: "Νομική υποχρέωση (Άρθ. 6(1)(γ))",
        retention: "10 χρόνια",
        destinations: ["SoftOne ERP", "ΑΑΔΕ (myDATA)", "Ελεγκτής"],
        riskLevel: "HIGH",
        externalTransfer: true,
        notes: "Διαβίβαση στη ΔΟΥ και ΑΑΔΕ",
      },
    ],
  },
  {
    department: "Marketing & Επικοινωνία",
    icon: "📣",
    entries: [
      {
        id: "mkt-1",
        category: "Email Marketing",
        dataTypes: ["Email", "Ονοματεπώνυμο", "Προτιμήσεις"],
        legalBasis: "Συγκατάθεση (Άρθ. 6(1)(α))",
        retention: "Έως ανάκληση συγκατάθεσης",
        destinations: ["Email Platform (π.χ. Mailchimp)"],
        riskLevel: "LOW",
        externalTransfer: true,
        notes: "Δυνατότητα unsubscribe σε κάθε email",
      },
    ],
  },
  {
    department: "Διοίκηση",
    icon: "🏛️",
    entries: [
      {
        id: "mgmt-1",
        category: "Εταιρικά Έγγραφα",
        dataTypes: ["Στοιχεία Μετόχων", "Συμβόλαια", "Πρακτικά ΔΣ"],
        legalBasis: "Νομική υποχρέωση (Άρθ. 6(1)(γ))",
        retention: "20 χρόνια",
        destinations: ["Νομικός Σύμβουλος", "ΓΕΜΗ"],
        riskLevel: "MEDIUM",
        externalTransfer: true,
      },
    ],
  },
];

export async function getDepartmentFlows(): Promise<DepartmentFlowData[]> {
  const rows = await prisma.departmentFlow.findMany({ orderBy: { department: "asc" } });

  if (rows.length === 0) {
    // Seed defaults
    await prisma.departmentFlow.createMany({
      data: DEFAULT_FLOWS.map((f) => ({
        department: f.department,
        icon: f.icon,
        entries: f.entries as any,
      })),
    });
    return DEFAULT_FLOWS.map((f, i) => ({ ...f, id: `default-${i}` }));
  }

  return rows.map((r) => ({
    id: r.id,
    department: r.department,
    icon: r.icon ?? "🏢",
    entries: r.entries as unknown as DataEntry[],
  }));
}

export async function saveDepartmentEntries(
  departmentId: string,
  entries: DataEntry[]
): Promise<void> {
  await prisma.departmentFlow.update({
    where: { id: departmentId },
    data: { entries: entries as any },
  });
  await logAction({ action: "UPDATE", entity: "DepartmentFlow", entityId: departmentId });
  revalidatePath("/mapper");
}

export async function linkDpiaToEntry(
  deptFlowId: string,
  entryId: string,
  dpiaId: string | null
): Promise<void> {
  const row = await prisma.departmentFlow.findUnique({ where: { id: deptFlowId } });
  if (!row) return;
  const entries = (row.entries as unknown as DataEntry[]).map((e) =>
    e.id === entryId ? { ...e, dpiaId: dpiaId ?? undefined } : e
  );
  await prisma.departmentFlow.update({ where: { id: deptFlowId }, data: { entries: entries as any } });
  revalidatePath("/mapper");
}

export async function addDepartment(department: string, icon: string): Promise<void> {
  const row = await prisma.departmentFlow.create({
    data: { department, icon, entries: [] as any },
  });
  await logAction({ action: "CREATE", entity: "DepartmentFlow", entityId: row.id });
  revalidatePath("/mapper");
}

export interface EntryContext {
  deptName: string;
  category: string;
  dataTypes: string[];
  legalBasis: string;
  retention: string;
  destinations: string[];
  riskLevel: string;
  externalTransfer: boolean;
  transferCountries?: string[];
  notes?: string;
}

export async function autoGenerateDpiaFromEntry(
  deptFlowId: string,
  entryId: string,
  ctx: EntryContext
): Promise<{ dpiaId: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Μη εξουσιοδοτημένος");

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not configured");


  const title = `DPIA — ${ctx.deptName}: ${ctx.category}`;

  const systemPrompt = `Είσαι εμπειρογνώμονας GDPR. Επιστρέφεις ΜΟΝΟ έγκυρο JSON χωρίς markdown.`;

  const userPrompt = `Για επεξεργασία δεδομένων υψηλού κινδύνου:
Τμήμα: ${ctx.deptName}
Κατηγορία: ${ctx.category}
Τύποι δεδομένων: ${ctx.dataTypes.join(", ")}
Νομική βάση: ${ctx.legalBasis}
Διατήρηση: ${ctx.retention}
Αποδέκτες: ${ctx.destinations.join(", ")}
Επίπεδο κινδύνου: ${ctx.riskLevel}${ctx.externalTransfer ? `\nΔιαβίβαση εκτός ΕΕ: ${(ctx.transferCountries ?? []).join(", ") || "Ναι"}` : ""}${ctx.notes ? `\nΣημειώσεις: ${ctx.notes}` : ""}

Δημιούργησε DPIA βάσει Άρθρου 35 GDPR. Επίστρεψε ΜΟΝΟ JSON:
{
  "processingPurpose": "2 παράγραφοι — σκοπός, κατηγορίες υποκειμένων, νομική βάση, αναγκαιότητα",
  "suggestedRisks": ["6 συγκεκριμένοι κίνδυνοι για αυτή την επεξεργασία"],
  "suggestedMitigations": ["ένα μέτρο για κάθε κίνδυνο, ίδια σειρά"]
}`;

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
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

  if (!response.ok) throw new Error(`DeepSeek API error: ${response.status}`);

  const data = await response.json();
  let content: string = data.choices?.[0]?.message?.content ?? "{}";
  content = content.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
  const s = content.indexOf("{");
  const e = content.lastIndexOf("}");
  if (s !== -1 && e !== -1) content = content.slice(s, e + 1);

  let parsed: { processingPurpose?: string; suggestedRisks?: string[]; suggestedMitigations?: string[] } = {};
  try { parsed = JSON.parse(content); } catch { /* use empty */ }

  const dpia = await prisma.dpiaReport.create({
    data: {
      userId: session.user.id,
      title,
      processingPurpose: parsed.processingPurpose ?? `Επεξεργασία δεδομένων κατηγορίας "${ctx.category}" από το τμήμα ${ctx.deptName}.`,
      necessityAssessed: true,
      dpoConsulted: false,
      risksIdentified: parsed.suggestedRisks ?? [],
      riskMitigation: parsed.suggestedMitigations ?? [],
      status: "DRAFT",
    },
  });

  await logAction({ action: "CREATE", entity: "DpiaReport", entityId: dpia.id });

  // Link the new DPIA to the data flow entry
  await linkDpiaToEntry(deptFlowId, entryId, dpia.id);

  revalidatePath("/dpia");
  revalidatePath("/mapper");
  return { dpiaId: dpia.id };
}
