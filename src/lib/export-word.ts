import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  AlignmentType,
  WidthType,
  ShadingType,
  BorderStyle,
  convertInchesToTwip,
} from "docx";

function headerRow(cells: string[]): TableRow {
  return new TableRow({
    tableHeader: true,
    children: cells.map(
      (text) =>
        new TableCell({
          shading: { type: ShadingType.SOLID, color: "0078D4" },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text, bold: true, color: "FFFFFF", size: 18 }),
              ],
            }),
          ],
        })
    ),
  });
}

function dataRow(cells: string[], shade?: string): TableRow {
  return new TableRow({
    children: cells.map(
      (text) =>
        new TableCell({
          shading: shade ? { type: ShadingType.SOLID, color: shade } : undefined,
          children: [
            new Paragraph({
              children: [new TextRun({ text, size: 18 })],
            }),
          ],
        })
    ),
  });
}

export async function buildAssessmentWord(
  categories: {
    title: string;
    percentage: number;
    level: string;
    gaps: { question: string; priority: string; action: string; situation?: string }[];
  }[],
  overallScore: number,
  companyName?: string
): Promise<Buffer> {
  const now = new Date().toLocaleDateString("el-GR");

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
        },
      },
    },
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "Αξιολόγηση Συμμόρφωσης GDPR",
                bold: true,
                size: 48,
                color: "0078D4",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: companyName ? `${companyName} · ` : "",
              }),
              new TextRun({ text: now }),
            ],
          }),
          new Paragraph({ text: "" }),

          // Overall score
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: `Συνολικός Βαθμός: ${overallScore}%`,
                color: overallScore >= 80 ? "107C41" : overallScore >= 50 ? "C55A11" : "C00000",
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text:
                  overallScore >= 80
                    ? "🟢 Συμμορφούμενο — Η επιχείρηση πληροί τις βασικές απαιτήσεις GDPR."
                    : overallScore >= 50
                    ? "🟠 Μερικώς Συμμορφούμενο — Απαιτούνται βελτιώσεις σε συγκεκριμένους τομείς."
                    : "🔴 Μη Συμμορφούμενο — Άμεσες ενέργειες απαιτούνται.",
              }),
            ],
          }),
          new Paragraph({ text: "" }),

          // Categories table
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: "Αποτελέσματα ανά Κατηγορία" })],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              headerRow(["Κατηγορία", "Βαθμολογία", "Επίπεδο", "Κενά"]),
              ...categories.map((cat) =>
                dataRow(
                  [cat.title, `${cat.percentage}%`, cat.level, `${cat.gaps.length}`],
                  cat.percentage >= 80 ? "E6F4EA" : cat.percentage >= 50 ? "FFF3E0" : "FDECEA"
                )
              ),
            ],
          }),
          new Paragraph({ text: "" }),

          // Gap analysis
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: "Σχέδιο Αντιμετώπισης Κενών" })],
          }),
          ...categories.flatMap((cat) => {
            if (cat.gaps.length === 0) return [];
            return [
              new Paragraph({
                heading: HeadingLevel.HEADING_2,
                children: [new TextRun({ text: cat.title })],
              }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  headerRow(["Ερώτηση", "Προτεραιότητα", "Υφιστάμενη Κατάσταση", "Ενέργεια"]),
                  ...cat.gaps.map((g) =>
                    dataRow([g.question, g.priority, g.situation ?? "—", g.action])
                  ),
                ],
              }),
              new Paragraph({ text: "" }),
            ];
          }),

          // Footer
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `GDPR Compliance OS · ${now} · Αρχείο ελέγχου διατηρείται στο σύστημα`,
                color: "888888",
                size: 16,
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

// ── Visual bar row used inside buildReportsWord ────────────────────────────
function scoreBarRow(label: string, score: number | null, fillColor: string): TableRow {
  const pct = score ?? 0;
  const barWidth = Math.round((pct / 100) * 7200); // max 7200 DXA ≈ 5 inches
  const emptyWidth = 7200 - barWidth;

  const labelCell = new TableCell({
    width: { size: 2400, type: WidthType.DXA },
    children: [new Paragraph({ children: [new TextRun({ text: label, size: 18, bold: true })] })],
  });

  if (score === null) {
    return new TableRow({
      children: [
        labelCell,
        new TableCell({
          width: { size: 7200, type: WidthType.DXA },
          shading: { type: ShadingType.SOLID, color: "EEEEEE" },
          children: [new Paragraph({ children: [new TextRun({ text: "Χωρίς δεδομένα", size: 16, color: "999999", italics: true })] })],
        }),
        new TableCell({
          width: { size: 1200, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: "—", size: 18, color: "999999" })] })],
        }),
      ],
    });
  }

  return new TableRow({
    children: [
      labelCell,
      new TableCell({
        width: { size: barWidth || 20, type: WidthType.DXA },
        shading: { type: ShadingType.SOLID, color: fillColor },
        children: [new Paragraph({ text: "" })],
      }),
      new TableCell({
        width: { size: emptyWidth || 20, type: WidthType.DXA },
        shading: { type: ShadingType.SOLID, color: "F3F4F6" },
        children: [new Paragraph({ text: "" })],
      }),
      new TableCell({
        width: { size: 1200, type: WidthType.DXA },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: `${pct}%`, size: 20, bold: true, color: fillColor })],
          }),
        ],
      }),
    ],
  });
}

export async function buildReportsWord(
  data: {
    overallScore: number;
    grade: string;
    modules: { label: string; score: number | null; fill: string }[];
    coverage: { label: string; value: number }[];
    companyName?: string;
  }
): Promise<Buffer> {
  const now = new Date().toLocaleDateString("el-GR");

  // Map hex fill colors to docx-safe 6-char hex (strip #)
  function toHex(c: string) { return c.replace("#", "").toUpperCase().padStart(6, "0"); }

  const overallColor =
    data.overallScore >= 80 ? "107C41" : data.overallScore >= 50 ? "C55A11" : "C00000";
  const overallBg =
    data.overallScore >= 80 ? "E6F4EA" : data.overallScore >= 50 ? "FFF3E0" : "FDECEA";
  const overallLabel =
    data.overallScore >= 80 ? "Συμμορφούμενο" : data.overallScore >= 50 ? "Μερικώς Συμμορφούμενο" : "Μη Συμμορφούμενο";

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22 } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        children: [
          // ── Title ──────────────────────────────────────────────────────────
          new Paragraph({
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Αναφορά Συμμόρφωσης GDPR", bold: true, size: 52, color: "0078D4" }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: data.companyName ? `${data.companyName}  ·  ` : "" }),
              new TextRun({ text: now }),
            ],
          }),
          new Paragraph({ text: "" }),

          // ── Overall score box ──────────────────────────────────────────────
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: overallBg },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: `${data.overallScore}%`, bold: true, size: 72, color: overallColor }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: overallLabel, bold: true, size: 28, color: overallColor }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "Συνολικός Βαθμός Συμμόρφωσης", size: 20, color: "666666" }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({ text: "" }),

          // ── Module scores with bar chart ───────────────────────────────────
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: "Ανάλυση ανά Τομέα", color: "0078D4" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "Βαθμολογία συμμόρφωσης ανά κατηγορία αξιολόγησης.", size: 18, color: "666666" })],
          }),
          new Paragraph({ text: "" }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  new TableCell({
                    width: { size: 2400, type: WidthType.DXA },
                    shading: { type: ShadingType.SOLID, color: "0078D4" },
                    children: [new Paragraph({ children: [new TextRun({ text: "Τομέας", bold: true, color: "FFFFFF", size: 18 })] })],
                  }),
                  new TableCell({
                    width: { size: 8400, type: WidthType.DXA },
                    shading: { type: ShadingType.SOLID, color: "0078D4" },
                    children: [new Paragraph({ children: [new TextRun({ text: "Βαθμολογία", bold: true, color: "FFFFFF", size: 18 })] })],
                  }),
                ],
              }),
              ...data.modules.map((m) =>
                scoreBarRow(m.label, m.score, toHex(m.fill))
              ),
            ],
          }),
          new Paragraph({ text: "" }),

          // ── Compliance coverage ────────────────────────────────────────────
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: "Κάλυψη Συμμόρφωσης Έργων", color: "0078D4" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "Κατανομή έργων βάσει ύπαρξης DPIA και DPA.", size: 18, color: "666666" })],
          }),
          new Paragraph({ text: "" }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              headerRow(["Κατηγορία Κάλυψης", "Αριθμός Έργων"]),
              ...data.coverage.map((c, i) =>
                dataRow([c.label, `${c.value}`], i % 2 === 0 ? "F3F4F6" : undefined)
              ),
            ],
          }),
          new Paragraph({ text: "" }),

          // ── Compliance levels legend ───────────────────────────────────────
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: "Κλίμακα Αξιολόγησης" })],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              headerRow(["Επίπεδο", "Εύρος", "Περιγραφή"]),
              dataRow(["Συμμορφούμενο", "≥ 80%", "Πληρούνται οι βασικές απαιτήσεις GDPR"], "E6F4EA"),
              dataRow(["Μερικώς Συμμορφούμενο", "50–79%", "Απαιτούνται βελτιώσεις σε συγκεκριμένους τομείς"], "FFF3E0"),
              dataRow(["Μη Συμμορφούμενο", "< 50%", "Άμεσες διορθωτικές ενέργειες απαιτούνται"], "FDECEA"),
            ],
          }),
          new Paragraph({ text: "" }),

          // ── Legal note ─────────────────────────────────────────────────────
          new Paragraph({
            children: [
              new TextRun({
                text: "Αυτή η αναφορά παράχθηκε αυτόματα από το GDPR Compliance OS βάσει των ολοκληρωμένων αξιολογήσεων. Άρθρο 5(2) GDPR — Αρχή Λογοδοσίας.",
                size: 16,
                color: "888888",
                italics: true,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `GDPR Compliance OS  ·  ${now}  ·  Εμπιστευτικό`,
                size: 14,
                color: "AAAAAA",
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
