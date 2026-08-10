import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { deepseekJson } from "@/lib/deepseek";
import { uploadToBunny } from "@/lib/bunny";
import { buildDpiaWord } from "@/lib/export-dpia-word";
import type { Remedy, RemedyContext } from "./types";

/**
 * `CREATE_DPIA`: το DeepSeek προτείνει κινδύνους και μέτρα βάσει του
 * αντικειμένου, των κατηγοριών δεδομένων και των υποεκτελούντων της
 * συγκεκριμένης συνεργασίας — όχι γενικόλογο κείμενο.
 *
 * Αν το μοντέλο αποτύχει (δύο προσπάθειες), το DPIA δημιουργείται ΚΑΙ ΠΑΛΙ,
 * χωρίς κινδύνους: ένα κενό DPIA που συμπληρώνει ο χρήστης με το χέρι είναι
 * χρησιμότερο από κανένα DPIA.
 */

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const DpiaAiSchema = z.object({
  risksIdentified: z.array(z.string().trim().min(1)).min(1),
  riskMitigation: z.array(z.string().trim().min(1)).min(1),
  riskLikelihood: z.number().int().min(1).max(5),
  riskImpact: z.number().int().min(1).max(5),
  riskReasoning: z.string().trim().min(1),
});

type DpiaAiResult = z.infer<typeof DpiaAiSchema>;

async function generateDpiaRisks(ctx: RemedyContext, subject: string): Promise<DpiaAiResult | null> {
  const dataCategories = ctx.extraction.dataCategories;
  const subProcessors = ctx.dataProcessingVendors;

  const system =
    "Είσαι εμπειρογνώμονας GDPR για ελληνικές εταιρείες λογισμικού και ERP integrators, " +
    "εξειδικευμένος στην Εκτίμηση Αντικτύπου (DPIA, Άρθρο 35). " +
    "Επιστρέφεις ΜΟΝΟ έγκυρο JSON, χωρίς markdown, χωρίς code blocks, χωρίς εξηγήσεις.";

  const user = `Για την Εκτίμηση Αντικτύπου (DPIA) της παρακάτω συνεργασίας:

Αντικείμενο: "${subject}"
Κατηγορίες δεδομένων: ${dataCategories.length ? dataCategories.join(", ") : "δεν προσδιορίστηκαν στη σύμβαση"}
Υποεκτελούντες: ${subProcessors.length ? subProcessors.join(", ") : "κανένας γνωστός"}
Ειδικές κατηγορίες δεδομένων (Άρθρο 9 GDPR): ${ctx.extraction.specialCategories ? "ΝΑΙ" : "όχι"}
Διασυνοριακή διαβίβαση: ${ctx.extraction.crossBorderTransfer ? "ΝΑΙ" : "όχι"}

Πρότεινε:
1. 4-6 συγκεκριμένους κινδύνους για τα δικαιώματα και τις ελευθερίες των υποκειμένων, προσαρμοσμένους στα παραπάνω δεδομένα — όχι γενικόλογους.
2. Ένα αντίστοιχο μέτρο αντιμετώπισης για κάθε κίνδυνο, στην ΙΔΙΑ σειρά.
3. Συνολική εκτίμηση πιθανότητας (1-5) και επίπτωσης (1-5) του εναπομείναντος κινδύνου, με σύντομη αιτιολόγηση.

Επίστρεψε ΜΟΝΟ JSON:
{
  "risksIdentified": ["...", "..."],
  "riskMitigation": ["...", "..."],
  "riskLikelihood": <ακέραιος 1-5>,
  "riskImpact": <ακέραιος 1-5>,
  "riskReasoning": "..."
}`;

  // Δύο προσπάθειες. Κάθε αποτυχία —δικτύου, JSON ή σχήματος— μετράει το ίδιο.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await deepseekJson({ system, user, temperature: 0.4, maxTokens: 1500 });
      return DpiaAiSchema.parse(raw);
    } catch {
      // δοκίμασε ξανά· μετά την τελευταία προσπάθεια ο καλών παίρνει null
    }
  }
  return null;
}

export const createDpia: Remedy = async (gap, ctx) => {
  const subject = ctx.extraction.subject?.trim() || `Η συνεργασία «${ctx.intakeTitle}»`;
  const risks = await generateDpiaRisks(ctx, subject);

  const report = await prisma.dpiaReport.create({
    data: {
      projectId: ctx.projectId,
      userId: ctx.userId,
      title: `DPIA — ${ctx.intakeTitle}`,
      processingPurpose: subject,
      risksIdentified: (risks?.risksIdentified ?? []) as never,
      riskMitigation: (risks?.riskMitigation ?? []) as never,
      riskLikelihood: risks?.riskLikelihood ?? null,
      riskImpact: risks?.riskImpact ?? null,
      riskReasoning: risks?.riskReasoning ?? null,
      status: "DRAFT",
    },
  });

  const buf = await buildDpiaWord({
    title: report.title,
    projectName: ctx.intakeTitle,
    createdBy: "Αυτόματη κάλυψη κενού συμμόρφωσης",
    createdAt: report.createdAt,
    status: report.status,
    processingPurpose: report.processingPurpose,
    risksIdentified: (report.risksIdentified as string[]) ?? [],
    riskMitigation: (report.riskMitigation as string[]) ?? [],
    necessityAssessed: false,
    dpoConsulted: false,
    riskLikelihood: report.riskLikelihood,
    riskImpact: report.riskImpact,
    riskReasoning: report.riskReasoning,
  });

  const pdfUrl = await uploadToBunny(buf, `intake/${ctx.intakeId}/dpia-${report.id}.docx`, DOCX_MIME);
  await prisma.dpiaReport.update({ where: { id: report.id }, data: { pdfUrl } });

  return {
    status: "CREATED",
    entityType: "DpiaReport",
    entityId: report.id,
    fileUrl: pdfUrl,
    label: risks
      ? "Εκτίμηση Αντικτύπου (DPIA) με προσυμπληρωμένους κινδύνους"
      : "Εκτίμηση Αντικτύπου (DPIA) — οι κίνδυνοι χρειάζονται συμπλήρωση με το χέρι",
  };
};
