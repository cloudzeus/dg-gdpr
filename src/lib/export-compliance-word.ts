import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  Footer,
  Header,
  PageBreak,
  TabStopType,
  TabStopPosition,
  LeaderType,
} from "docx";

const BLUE = "0078D4";
const DARK = "1F3F5E";
const GRAY = "605E5C";
const LIGHT_GRAY = "EDEBE9";

export interface OrgData {
  name: string;
  legalName?: string | null;
  vatNumber?: string | null;
  taxOffice?: string | null;
  registryNo?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  website?: string | null;
  description?: string | null;
  phones?: { label: string; number: string }[];
  emails?: { label: string; address: string }[];
}

export interface PolicyEntry {
  title: string;
  type: string;
  version: string;
  status: string;
  content: string | null;
  effectiveDate?: Date | null;
  reviewDate?: Date | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function coverPara(text: string, size: number, bold = false, color = DARK, center = false): Paragraph {
  return new Paragraph({
    alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { after: 80 },
    children: [new TextRun({ text, bold, size, color })],
  });
}

function h1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 500, after: 200 },
    children: [new TextRun({ text, bold: true, size: 28, color: BLUE })],
  });
}

function h2(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 140 },
    children: [new TextRun({ text, bold: true, size: 24, color: DARK })],
  });
}

function h3(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 100 },
    children: [new TextRun({ text, bold: true, size: 22, color: DARK })],
  });
}

function body(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, size: 20 })],
  });
}

function bullet(text: string, level = 0): Paragraph {
  return new Paragraph({
    bullet: { level },
    spacing: { after: 80 },
    children: [new TextRun({ text, size: 20 })],
  });
}

function field(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 100 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 20 }),
      new TextRun({ text: value || "—", size: 20 }),
    ],
  });
}

function separator(): Paragraph {
  return new Paragraph({ spacing: { before: 180, after: 180 }, children: [new TextRun({ text: "" })] });
}

function pageBreak(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] });
}

// ── Strip HTML → plain text sections ─────────────────────────────────────────

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&hellip;/g, "…");
}

function stripInline(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function htmlToDocxParagraphs(html: string): Paragraph[] {
  if (!html) return [];
  const out: Paragraph[] = [];

  // Process block-level tags sequentially
  const blockRe =
    /<(h[1-6]|p|li|blockquote|hr)\b[^>]*>([\s\S]*?)<\/\1>|<hr\s*\/?>/gi;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = blockRe.exec(html)) !== null) {
    const tag = (m[1] ?? "hr").toLowerCase();
    const inner = stripInline(m[2] ?? "");

    if (!inner && tag !== "hr") continue;

    if (tag === "h1") out.push(h2(inner));
    else if (tag === "h2") out.push(h3(inner));
    else if (tag === "h3" || tag === "h4" || tag === "h5" || tag === "h6")
      out.push(new Paragraph({ spacing: { before: 180, after: 80 }, children: [new TextRun({ text: inner, bold: true, size: 20, color: DARK })] }));
    else if (tag === "li") out.push(bullet(inner));
    else if (tag === "blockquote")
      out.push(new Paragraph({ indent: { left: 720 }, spacing: { after: 100 }, children: [new TextRun({ text: inner, italics: true, size: 20, color: GRAY })] }));
    else if (tag === "hr") out.push(separator());
    else if (inner) out.push(body(inner));

    last = blockRe.lastIndex;
  }

  // Fallback: if no block tags matched, treat the whole content as a body paragraph
  if (out.length === 0) {
    const plain = stripInline(html);
    if (plain) out.push(body(plain));
  }

  return out;
}

// ── Main builder ──────────────────────────────────────────────────────────────

export async function buildCompliancePackageWord(
  org: OrgData,
  policies: PolicyEntry[]
): Promise<Buffer> {
  const now = new Date().toLocaleDateString("el-GR");
  const activePolicies = policies.filter((p) => p.content);

  // Cover section children
  const coverChildren: Paragraph[] = [
    // Decorative top
    new Paragraph({ spacing: { before: 600, after: 0 }, children: [new TextRun({ text: "" })] }),

    coverPara("ΠΑΚΕΤΟ ΣΥΜΜΟΡΦΩΣΗΣ GDPR", 52, true, BLUE, true),
    coverPara("Data Protection Compliance Package", 28, false, GRAY, true),

    separator(),
    separator(),

    coverPara(org.name, 36, true, DARK, true),
    ...(org.legalName && org.legalName !== org.name
      ? [coverPara(org.legalName, 24, false, GRAY, true)]
      : []),

    separator(),

    ...(org.vatNumber ? [coverPara(`ΑΦΜ: ${org.vatNumber}`, 20, false, GRAY, true)] : []),
    ...(org.registryNo ? [coverPara(`ΓΕΜΗ: ${org.registryNo}`, 20, false, GRAY, true)] : []),
    ...([org.addressLine1, org.postalCode, org.city, org.country]
      .filter(Boolean)
      .join(", ")
      ? [coverPara([org.addressLine1, org.postalCode, org.city, org.country].filter(Boolean).join(", "), 20, false, GRAY, true)]
      : []),
    ...(org.website ? [coverPara(org.website, 20, false, GRAY, true)] : []),

    separator(),
    separator(),

    coverPara(`Ημερομηνία Έκδοσης: ${now}`, 20, false, GRAY, true),
    coverPara(`Σύνολο Πολιτικών: ${activePolicies.length}`, 20, false, GRAY, true),

    separator(),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [
        new TextRun({
          text: "Εμπιστευτικό Έγγραφο — GDPR Κανονισμός (ΕΕ) 2016/679",
          size: 18,
          italics: true,
          color: GRAY,
        }),
      ],
    }),

    pageBreak(),
  ];

  // Section 1: Organisation details
  const orgChildren: Paragraph[] = [
    h1("1. Στοιχεία Οργανισμού"),
    field("Επωνυμία", org.name),
    ...(org.legalName ? [field("Νομική Επωνυμία", org.legalName)] : []),
    ...(org.vatNumber ? [field("ΑΦΜ", org.vatNumber)] : []),
    ...(org.taxOffice ? [field("ΔΟΥ", org.taxOffice)] : []),
    ...(org.registryNo ? [field("ΓΕΜΗ", org.registryNo)] : []),
    ...([org.addressLine1, org.addressLine2, org.postalCode, org.city, org.country]
      .filter(Boolean).length > 0
      ? [field("Έδρα", [org.addressLine1, org.addressLine2, org.postalCode, org.city, org.country].filter(Boolean).join(", "))]
      : []),
    ...(org.website ? [field("Website", org.website)] : []),
    separator(),
    ...(org.emails && org.emails.length > 0
      ? [h2("Επικοινωνία"), ...org.emails.filter((e) => e.address).map((e) => field(e.label || "Email", e.address))]
      : []),
    ...(org.phones && org.phones.length > 0
      ? [...org.phones.filter((p) => p.number).map((p) => field(p.label || "Τηλέφωνο", p.number))]
      : []),
    separator(),
    ...(org.description
      ? [h2("Δραστηριότητα"), body(org.description), separator()]
      : []),
    pageBreak(),
  ];

  // Section 2: GDPR framework statement
  const frameworkChildren: Paragraph[] = [
    h1("2. Πλαίσιο Συμμόρφωσης GDPR"),
    body(
      `Η εταιρεία ${org.name} δηλώνει ότι τηρεί πλήρως τις απαιτήσεις του Κανονισμού (ΕΕ) 2016/679 (GDPR) ` +
      "και της ελληνικής νομοθεσίας προστασίας δεδομένων προσωπικού χαρακτήρα."
    ),
    body(
      "Το παρόν πακέτο συμμόρφωσης περιλαμβάνει το σύνολο των ισχυουσών πολιτικών του οργανισμού " +
      "και προορίζεται για χρήση από τρίτους Υπεύθυνους ή Εκτελούντες Επεξεργασίας στο πλαίσιο " +
      "ελέγχου δέουσας επιμέλειας (due diligence) πριν τη σύναψη Σύμβασης Επεξεργασίας Δεδομένων (DPA)."
    ),
    separator(),
    h2("Νομικό Πλαίσιο"),
    bullet("Κανονισμός (ΕΕ) 2016/679 — Γενικός Κανονισμός Προστασίας Δεδομένων (GDPR)"),
    bullet("Ν. 4624/2019 — Ελληνικός Νόμος εφαρμογής GDPR"),
    bullet("Άρθρο 5: Αρχές επεξεργασίας προσωπικών δεδομένων"),
    bullet("Άρθρο 24: Ευθύνη υπεύθυνου επεξεργασίας"),
    bullet("Άρθρο 28: Εκτελών την επεξεργασία"),
    bullet("Άρθρο 32: Ασφάλεια επεξεργασίας"),
    separator(),
    h2("Πεδίο Εφαρμογής"),
    body(
      "Οι ακόλουθες πολιτικές εφαρμόζονται σε όλες τις δραστηριότητες επεξεργασίας δεδομένων " +
      "του οργανισμού, στο σύνολο του προσωπικού, των συνεργατών και των εξωτερικών παρόχων."
    ),
    pageBreak(),
  ];

  // Section 3: Table of contents (policy list)
  const tocChildren: Paragraph[] = [
    h1("3. Πίνακας Πολιτικών"),
    ...activePolicies.map((p, i) =>
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({ text: `${i + 1}. `, bold: true, size: 20, color: BLUE }),
          new TextRun({ text: p.title, size: 20 }),
          new TextRun({ text: `  v${p.version}`, size: 18, color: GRAY }),
          ...(p.effectiveDate
            ? [new TextRun({ text: `  (${new Date(p.effectiveDate).toLocaleDateString("el-GR")})`, size: 18, color: GRAY })]
            : []),
        ],
      })
    ),
    pageBreak(),
  ];

  // Policy sections
  const policySections: Paragraph[] = [];
  activePolicies.forEach((p, i) => {
    policySections.push(
      h1(`${i + 4}. ${p.title}`),
      field("Κατάσταση", p.status === "ACTIVE" ? "Ενεργή" : p.status),
      field("Έκδοση", p.version),
      ...(p.effectiveDate
        ? [field("Ημερομηνία Εφαρμογής", new Date(p.effectiveDate).toLocaleDateString("el-GR"))]
        : []),
      ...(p.reviewDate
        ? [field("Ημερομηνία Αναθεώρησης", new Date(p.reviewDate).toLocaleDateString("el-GR"))]
        : []),
      separator(),
      ...htmlToDocxParagraphs(p.content ?? ""),
      ...(i < activePolicies.length - 1 ? [pageBreak()] : []),
    );
  });

  const allChildren = [
    ...coverChildren,
    ...orgChildren,
    ...frameworkChildren,
    ...tocChildren,
    ...policySections,
  ];

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 20 } },
      },
    },
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `${org.name} — Πακέτο Συμμόρφωσης GDPR`, size: 16, color: GRAY }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `Εμπιστευτικό · ${org.name} · ${now}`, size: 16, color: GRAY }),
                ],
              }),
            ],
          }),
        },
        children: allChildren,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
