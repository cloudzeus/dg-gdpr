import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deepseekJson } from "@/lib/deepseek";
import { loc } from "@/lib/localized";

interface DpiaVerdict {
  required: boolean;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  triggers: string[];
  reasoning: { el: string; en: string };
  risks: Array<{ risk: { el: string; en: string }; mitigation: { el: string; en: string } }>;
}

// POST { projectId } — uses the project's description + purposes + collected fields to
// decide (via DeepSeek, Art. 35 GDPR) whether a DPIA is required. If yes, a linked
// DpiaReport is created/updated in the existing DPIA table.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await req.json();
  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

  const project = await prisma.consentProject.findUnique({
    where: { id: projectId },
    include: { fields: { include: { field: true } }, purposes: true },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const fieldLines = project.fields.map(
    (pf) => `- ${loc(pf.field.label, "el")}${pf.field.isSpecialCategory ? " [ΕΙΔΙΚΗ ΚΑΤΗΓΟΡΙΑ — Άρθρο 9]" : ""}`,
  );
  const purposeLines = project.purposes.map(
    (p) => `- ${loc(p.label, "el")} (νομική βάση: ${p.legalBasis})${loc(p.description, "el") ? `: ${loc(p.description, "el")}` : ""}`,
  );
  const hasSpecial = project.fields.some((pf) => pf.field.isSpecialCategory);

  let verdict: DpiaVerdict;
  try {
    verdict = await deepseekJson<DpiaVerdict>({
      system:
        "Είσαι DPO/νομικός σύμβουλος GDPR. Αξιολογείς αν απαιτείται Εκτίμηση Αντικτύπου (DPIA) κατά το Άρθρο 35 GDPR και τις κατευθυντήριες γραμμές WP248. Επιστρέφεις ΜΟΝΟ JSON αυτής της μορφής, χωρίς markdown/επεξηγήσεις:\n" +
        '{"required":boolean,"riskLevel":"LOW|MEDIUM|HIGH","triggers":["..."],"reasoning":{"el":"...","en":"..."},"risks":[{"risk":{"el":"...","en":"..."},"mitigation":{"el":"...","en":"..."}}]}',
      user:
        `Αξιολόγησε αν απαιτείται DPIA για την παρακάτω δραστηριότητα συλλογής συναινέσεων.\n\n` +
        `Όνομα: ${project.name}\n` +
        `Περιγραφή: ${loc(project.description, "el") || "(κενή)"}\n\n` +
        `Σκοποί επεξεργασίας:\n${purposeLines.join("\n") || "(κανένας)"}\n\n` +
        `Συλλεγόμενα προσωπικά δεδομένα:\n${fieldLines.join("\n") || "(κανένα)"}\n\n` +
        `${hasSpecial ? "ΠΡΟΣΟΧΗ: περιλαμβάνονται ειδικές κατηγορίες δεδομένων (Άρθρο 9).\n" : ""}` +
        `Λάβε υπόψη τα κριτήρια του Άρθρου 35 παρ. 3 και τα 9 κριτήρια WP248. Δώσε riskLevel, τους λόγους (triggers), αιτιολόγηση EL/EN και 2-5 βασικούς κινδύνους με μέτρα μετριασμού.`,
      temperature: 0.2,
      maxTokens: 1500,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  let dpiaId: string | null = null;
  if (verdict.required) {
    const title = `DPIA — ${project.name}`;
    const processingPurpose =
      `Δραστηριότητα συλλογής συναινέσεων «${project.name}».\n\n` +
      `Περιγραφή: ${loc(project.description, "el") || "—"}\n\n` +
      `Σκοποί:\n${purposeLines.join("\n") || "—"}\n\n` +
      `Δεδομένα:\n${fieldLines.join("\n") || "—"}`;
    const status = verdict.riskLevel === "HIGH" ? "REQUIRES_CONSULTATION" : "DRAFT";

    const existing = await prisma.dpiaReport.findFirst({ where: { consentProjectId: project.id } });
    const data = {
      consentProjectId: project.id,
      userId: session.user.id,
      title,
      processingPurpose,
      necessityAssessed: true,
      risksIdentified: verdict.risks as never,
      riskMitigation: verdict.risks.map((r) => r.mitigation) as never,
      status: status as never,
    };
    const dpia = existing
      ? await prisma.dpiaReport.update({ where: { id: existing.id }, data })
      : await prisma.dpiaReport.create({ data });
    dpiaId = dpia.id;
  }

  return NextResponse.json({ ...verdict, dpiaId });
}
