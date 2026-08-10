import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";
import { prisma } from "@/lib/prisma";
import { uploadToBunny } from "@/lib/bunny";
import { buildDpaWord } from "@/lib/export-dpa-word";
import { toDpaRole, type PartyRoleValue, type DpaRoleValue } from "@/lib/intake/role-mapping";
import { buildArticle28Clauses, type Clause, type ClauseInput } from "./clauses";
import type { ContextParty, Remedy, RemedyContext } from "./types";

/**
 * `CREATE_DPA`, `CREATE_CONTRACT_CLAUSES` και `CREATE_JCA` — τρεις μορφές του
 * ΙΔΙΟΥ νομικού περιεχομένου (άρθρο 26 ή 28), παραγόμενες από το ίδιο ζεύγος
 * μερών. Η λογική εύρεσης του ζεύγους και μετάφρασης των ρόλων ζει εδώ μία
 * φορά· διαφορετικά τρεις εκτελεστές θα διαφωνούσαν στην πρώτη διόρθωση.
 */

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const DEFAULT_RETENTION = "Για τη διάρκεια της σύμβασης και έως 5 έτη μετά τη λήξη της, σύμφωνα με τις διατάξεις περί παραγραφής αξιώσεων.";
const DEFAULT_DATA_CATEGORIES = [
  "Δεδομένα ταυτοποίησης και επικοινωνίας των εμπλεκομένων φυσικών προσώπων, όπως προκύπτουν από την εκτέλεση της σύμβασης",
];
const DEFAULT_PURPOSES = ["Η εκτέλεση της κύριας σύμβασης μεταξύ των μερών."];

const ROLE_LABELS: Record<string, string> = {
  CONTROLLER: "Υπεύθυνος Επεξεργασίας",
  PROCESSOR: "Εκτελών την Επεξεργασία",
  JOINT_CONTROLLER: "Από κοινού Υπεύθυνος Επεξεργασίας",
  SUB_PROCESSOR: "Υποεκτελών",
  RECIPIENT: "Αποδέκτης",
  THIRD_PARTY: "Τρίτος",
};

function roleLabel(role: string | null | undefined): string {
  return role ? (ROLE_LABELS[role] ?? role) : "χωρίς ρόλο";
}

interface ResolvedPair {
  ours: ContextParty;
  theirs: ContextParty;
  dpaRole: DpaRoleValue;
  controllerParty: ContextParty;
  processorParty: ContextParty;
}

type PairResolution = { ok: true; pair: ResolvedPair } | { ok: false; reason: string };

/**
 * Βρίσκει το πρώτο ζεύγος δική-μας/αντισυμβαλλόμενος με επιβεβαιωμένο ρόλο
 * και το μεταφράζει σε `DpaRole`. Καμία εικασία: αν λείπει η μία πλευρά ή ο
 * συνδυασμός ρόλων δεν αντιστοιχεί σε σχέση άρθρου 26/28, `SKIPPED`.
 */
function resolvePair(ctx: RemedyContext): PairResolution {
  const ours = ctx.ours.find((p) => p.role);
  const theirs = ctx.external.find((p) => p.role);

  if (!ours || !theirs) {
    return {
      ok: false,
      reason:
        "Χρειάζονται δύο μέρη με επιβεβαιωμένο ρόλο — η δική μας εταιρία και ο αντισυμβαλλόμενος — για να συνταχθεί σύμβαση επεξεργασίας δεδομένων.",
    };
  }

  const dpaRole = toDpaRole(ours.role, theirs.role);
  if (!dpaRole) {
    return {
      ok: false,
      reason:
        `Ο συνδυασμός ρόλων («${roleLabel(ours.role)}» / «${roleLabel(theirs.role)}») δεν αντιστοιχεί ` +
        "σε σχέση Υπευθύνου–Εκτελούντος ή από κοινού Υπευθύνων Επεξεργασίας.",
    };
  }

  // Ποιος είναι Υπεύθυνος προκύπτει ΑΠΕΥΘΕΙΑΣ από τον επιβεβαιωμένο ρόλο, όχι
  // από παραγωγή μέσω του DpaRole. Το DpaRole περιγράφει τη σχέση από τη
  // σκοπιά του τρίτου («COMPANY_AS_...»), και η αντιστροφή του ήταν εύκολη —
  // παρήγαγε DPA που ονόμαζε Υπεύθυνο τον Εκτελούντα.
  // Στην JOINT_CONTROLLERS δεν υπάρχει Εκτελών· τα πεδία απλώς γεμίζουν τη
  // σταθερή μορφή του DpaContract.
  const { controllerParty, processorParty } = assignSides(ours, theirs);

  return { ok: true, pair: { ours, theirs, dpaRole, controllerParty, processorParty } };
}

/**
 * Ποιος μπαίνει στη θέση του Υπευθύνου και ποιος του Εκτελούντος.
 *
 * Καθαρή και εξαγόμενη επίτηδες: η προηγούμενη εκδοχή την παρήγαγε από το
 * `DpaRole` με άρνηση και ήταν αντεστραμμένη — το παραγόμενο DPA ονόμαζε
 * Υπεύθυνο Επεξεργασίας τον Εκτελούντα, που είναι ό,τι χειρότερο μπορεί να
 * γράψει μια σύμβαση άρθρου 28.
 */
export function assignSides<T extends { role: PartyRoleValue | null }>(
  ours: T,
  theirs: T
): { controllerParty: T; processorParty: T } {
  return ours.role === "CONTROLLER"
    ? { controllerParty: ours, processorParty: theirs }
    : { controllerParty: theirs, processorParty: ours };
}

function clausesInputFor(ctx: RemedyContext, pair: ResolvedPair): ClauseInput {
  return {
    controllerName: pair.controllerParty.name,
    processorName: pair.processorParty.name,
    subject: ctx.extraction.subject,
    // Η εξαγωγή δεν κρατά ξεχωριστό πεδίο σκοπών — μόνο αντικείμενο. Το κενό
    // πίνακα εδώ είναι ειλικρινές: δεν υπάρχει τέτοιο δεδομένο να αντληθεί.
    purposes: [],
    dataCategories: ctx.extraction.dataCategories,
    retentionPeriod: ctx.extraction.term?.trim() || DEFAULT_RETENTION,
    subProcessors: ctx.dataProcessingVendors,
    crossBorderTransfer: ctx.extraction.crossBorderTransfer,
    specialCategories: ctx.extraction.specialCategories,
  };
}

async function buildClausesWord(pair: ResolvedPair, clauses: Clause[]): Promise<Buffer> {
  const BLUE = "0078D4";
  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 20 } } } },
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({ text: "ΡΗΤΡΕΣ ΕΠΕΞΕΡΓΑΣΙΑΣ ΔΕΔΟΜΕΝΩΝ", bold: true, size: 36, color: BLUE }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({ text: "Προς ενσωμάτωση στη σύμβαση έργου — Άρθρο 28 GDPR", size: 20, color: "666666" }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: `${pair.controllerParty.name} & ${pair.processorParty.name}`,
                size: 20,
                italics: true,
              }),
            ],
          }),
          ...clauses.flatMap((c) => [
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 150 },
              children: [
                new TextRun({ text: `Άρθρο ${c.number} — ${c.title}`, bold: true, size: 24, color: BLUE }),
              ],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [new TextRun({ text: c.body, size: 20 })],
            }),
          ]),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

function clauseTextFor(clauses: Clause[]): string {
  return clauses.map((c) => `Άρθρο ${c.number} — ${c.title}\n\n${c.body}`).join("\n\n");
}

/** Δεδομένα με πραγματικό περιεχόμενο αν υπάρχει· αλλιώς λογική ελληνική προεπιλογή. */
function orDefault(items: string[], fallback: string[]): string[] {
  const clean = items.map((i) => i.trim()).filter(Boolean);
  return clean.length ? clean : fallback;
}

export const createDpa: Remedy = async (gap, ctx) => {
  const resolution = resolvePair(ctx);
  if (!resolution.ok) return { status: "SKIPPED", reason: resolution.reason };
  const { pair } = resolution;

  // Η από κοινού σχέση Υπευθύνων συντάσσεται ως JCA (άρθρο 26), όχι ως DPA
  // άρθρου 28 — δύο Υπεύθυνοι δεν υπογράφουν σύμβαση εκτελούντος.
  if (pair.dpaRole === "JOINT_CONTROLLERS") {
    return {
      status: "SKIPPED",
      reason: "Οι ρόλοι υποδεικνύουν από κοινού Υπευθύνους — χρειάζεται συμφωνία άρθρου 26, όχι DPA άρθρου 28.",
    };
  }

  if (!ctx.projectId) {
    return { status: "SKIPPED", reason: "Το έργο δημιουργείται στο βήμα 6 — η σύμβαση θα παραχθεί μετά." };
  }

  const dataCategories = orDefault(ctx.extraction.dataCategories, DEFAULT_DATA_CATEGORIES);
  // Σκοποί από το έγγραφο· η προεπιλογή μπαίνει μόνο αν δεν βρέθηκε κανένας.
  const purposes = ctx.extraction.purposes.length ? ctx.extraction.purposes : DEFAULT_PURPOSES;
  const retentionPeriod = ctx.extraction.term?.trim() || DEFAULT_RETENTION;

  const clauses = buildArticle28Clauses(clausesInputFor(ctx, pair));
  const safeguards = clauses.find((c) => c.title === "Ασφάλεια της επεξεργασίας")?.body ?? null;

  const contract = await prisma.dpaContract.create({
    data: {
      projectId: ctx.projectId,
      userId: ctx.userId,
      companyId: pair.theirs.companyId,
      roleInDpa: pair.dpaRole as never,
      title: `Σύμβαση Επεξεργασίας Δεδομένων — ${pair.controllerParty.name} / ${pair.processorParty.name}`,
      controllerName: pair.controllerParty.name,
      controllerVat: pair.controllerParty.vat,
      controllerAddress: pair.controllerParty.address,
      controllerRep: pair.controllerParty.representative,
      controllerEmail: pair.controllerParty.email,
      processorName: pair.processorParty.name,
      processorVat: pair.processorParty.vat,
      processorAddress: pair.processorParty.address,
      processorRep: pair.processorParty.representative,
      processorEmail: pair.processorParty.email,
      dataCategories: dataCategories as never,
      purposes: purposes as never,
      retentionPeriod,
      safeguards,
      subProcessors: ctx.dataProcessingVendors as never,
      gdprArticles: "Άρθρο 28 GDPR",
      status: "PENDING",
    },
  });

  const buf = await buildDpaWord({
    title: contract.title,
    controllerName: contract.controllerName,
    controllerVat: contract.controllerVat ?? undefined,
    controllerAddress: contract.controllerAddress ?? undefined,
    controllerRep: contract.controllerRep ?? undefined,
    controllerEmail: contract.controllerEmail ?? undefined,
    processorName: contract.processorName,
    processorVat: contract.processorVat ?? undefined,
    processorAddress: contract.processorAddress ?? undefined,
    processorRep: contract.processorRep ?? undefined,
    processorEmail: contract.processorEmail ?? undefined,
    dataCategories,
    purposes,
    retentionPeriod,
    safeguards: safeguards ?? undefined,
    subProcessors: ctx.dataProcessingVendors,
    gdprArticles: contract.gdprArticles ?? undefined,
    projectName: ctx.intakeTitle,
  });

  const pdfUrl = await uploadToBunny(buf, `intake/${ctx.intakeId}/dpa-${contract.id}.docx`, DOCX_MIME);
  await prisma.dpaContract.update({ where: { id: contract.id }, data: { pdfUrl } });

  return {
    status: "CREATED",
    entityType: "DpaContract",
    entityId: contract.id,
    fileUrl: pdfUrl,
    label: "Σύμβαση Επεξεργασίας Δεδομένων (DPA)",
  };
};

export const createContractClauses: Remedy = async (gap, ctx) => {
  const resolution = resolvePair(ctx);
  if (!resolution.ok) return { status: "SKIPPED", reason: resolution.reason };
  const { pair } = resolution;

  if (pair.dpaRole === "JOINT_CONTROLLERS") {
    return {
      status: "SKIPPED",
      reason: "Οι ρόλοι υποδεικνύουν από κοινού Υπευθύνους — χρειάζεται συμφωνία άρθρου 26, όχι ρήτρες άρθρου 28.",
    };
  }

  const clauses = buildArticle28Clauses(clausesInputFor(ctx, pair));
  const buf = await buildClausesWord(pair, clauses);
  const pdfUrl = await uploadToBunny(buf, `intake/${ctx.intakeId}/clauses-${gap.id}.docx`, DOCX_MIME);
  const text = clauseTextFor(clauses);

  await prisma.intakeGap.update({
    where: { id: gap.id },
    data: { remedyPayload: { text, fileUrl: pdfUrl } as never },
  });

  return {
    status: "CREATED",
    entityType: "ContractClauses",
    entityId: gap.id,
    fileUrl: pdfUrl,
    label: "Ρήτρες άρθρου 28 προς ενσωμάτωση στη σύμβαση έργου",
  };
};

export const createJca: Remedy = async (gap, ctx) => {
  const resolution = resolvePair(ctx);
  if (!resolution.ok) return { status: "SKIPPED", reason: resolution.reason };
  const { pair } = resolution;

  if (pair.dpaRole !== "JOINT_CONTROLLERS") {
    return {
      status: "SKIPPED",
      reason: "Οι ρόλοι δεν υποδεικνύουν σχέση από κοινού Υπευθύνων Επεξεργασίας (άρθρο 26).",
    };
  }

  if (!ctx.projectId) {
    return { status: "SKIPPED", reason: "Το έργο δημιουργείται στο βήμα 6 — η συμφωνία θα παραχθεί μετά." };
  }

  const dataCategories = orDefault(ctx.extraction.dataCategories, DEFAULT_DATA_CATEGORIES);
  const purposes = ctx.extraction.purposes.length ? ctx.extraction.purposes : DEFAULT_PURPOSES;
  const retentionPeriod = ctx.extraction.term?.trim() || DEFAULT_RETENTION;

  const clauses = buildArticle28Clauses(clausesInputFor(ctx, pair));
  const safeguards = clauses.find((c) => c.title === "Ασφάλεια της επεξεργασίας")?.body ?? null;

  const contract = await prisma.dpaContract.create({
    data: {
      projectId: ctx.projectId,
      userId: ctx.userId,
      companyId: pair.theirs.companyId,
      roleInDpa: "JOINT_CONTROLLERS",
      title: `Συμφωνία από κοινού Υπευθύνων Επεξεργασίας (άρθρο 26) — ${pair.ours.name} / ${pair.theirs.name}`,
      controllerName: pair.controllerParty.name,
      controllerVat: pair.controllerParty.vat,
      controllerAddress: pair.controllerParty.address,
      controllerRep: pair.controllerParty.representative,
      controllerEmail: pair.controllerParty.email,
      processorName: pair.processorParty.name,
      processorVat: pair.processorParty.vat,
      processorAddress: pair.processorParty.address,
      processorRep: pair.processorParty.representative,
      processorEmail: pair.processorParty.email,
      dataCategories: dataCategories as never,
      purposes: purposes as never,
      retentionPeriod,
      safeguards,
      subProcessors: ctx.dataProcessingVendors as never,
      gdprArticles: "Άρθρο 26 GDPR",
      status: "PENDING",
    },
  });

  const buf = await buildDpaWord({
    title: contract.title,
    controllerName: contract.controllerName,
    controllerVat: contract.controllerVat ?? undefined,
    controllerAddress: contract.controllerAddress ?? undefined,
    controllerRep: contract.controllerRep ?? undefined,
    controllerEmail: contract.controllerEmail ?? undefined,
    processorName: contract.processorName,
    processorVat: contract.processorVat ?? undefined,
    processorAddress: contract.processorAddress ?? undefined,
    processorRep: contract.processorRep ?? undefined,
    processorEmail: contract.processorEmail ?? undefined,
    dataCategories,
    purposes,
    retentionPeriod,
    safeguards: safeguards ?? undefined,
    subProcessors: ctx.dataProcessingVendors,
    gdprArticles: contract.gdprArticles ?? undefined,
    projectName: ctx.intakeTitle,
  });

  const pdfUrl = await uploadToBunny(buf, `intake/${ctx.intakeId}/jca-${contract.id}.docx`, DOCX_MIME);
  await prisma.dpaContract.update({ where: { id: contract.id }, data: { pdfUrl } });

  return {
    status: "CREATED",
    entityType: "DpaContract",
    entityId: contract.id,
    fileUrl: pdfUrl,
    label: "Συμφωνία από κοινού Υπευθύνων Επεξεργασίας (άρθρο 26)",
  };
};
