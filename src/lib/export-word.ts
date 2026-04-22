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
