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
  BorderStyle,
  Footer,
  Header,
} from "docx";

export interface DpiaWordData {
  title: string;
  projectName: string;
  createdBy: string;
  createdAt: Date;
  status: string;
  processingPurpose: string;
  risksIdentified: string[];
  riskMitigation: string[];
  necessityAssessed: boolean;
  dpoConsulted: boolean;
  dpoName?: string | null;
  supervisoryBody?: string | null;
}

const BLUE = "0078D4";
const DARK = "1F3F5E";
const GREEN = "107C10";
const ORANGE = "CA5010";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Προσχέδιο",
  IN_REVIEW: "Υπό Αξιολόγηση",
  APPROVED: "Εγκεκριμένο",
  REQUIRES_CONSULTATION: "Απαιτείται Διαβούλευση",
};

function h1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, size: 28, color: BLUE })],
  });
}

function h2(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text, bold: true, size: 24, color: DARK })],
  });
}

function body(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
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

function bullet(text: string, color?: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, size: 20, color })],
  });
}

function separator(): Paragraph {
  return new Paragraph({ spacing: { before: 200, after: 200 }, children: [new TextRun({ text: "" })] });
}

function checkField(label: string, checked: boolean): Paragraph {
  return new Paragraph({
    spacing: { after: 100 },
    children: [
      new TextRun({ text: checked ? "☑ " : "☐ ", size: 20, color: checked ? GREEN : ORANGE }),
      new TextRun({ text: label, size: 20, bold: checked }),
    ],
  });
}

function twoColTable(leftItems: string[], rightItems: string[]): Table {
  const maxRows = Math.max(leftItems.length, rightItems.length, 1);
  const rows: TableRow[] = [];

  // Header row
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          shading: { fill: "FFF4CE" },
          children: [new Paragraph({ children: [new TextRun({ text: "Κίνδυνοι", bold: true, size: 20, color: ORANGE })] })],
        }),
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          shading: { fill: "DFF6DD" },
          children: [new Paragraph({ children: [new TextRun({ text: "Μέτρα Αντιμετώπισης", bold: true, size: 20, color: GREEN })] })],
        }),
      ],
    })
  );

  for (let i = 0; i < maxRows; i++) {
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { after: 60 },
                children: [new TextRun({ text: leftItems[i] ?? "", size: 18 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { after: 60 },
                children: [new TextRun({ text: rightItems[i] ?? "", size: 18 })],
              }),
            ],
          }),
        ],
      })
    );
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

export async function buildDpiaWord(data: DpiaWordData): Promise<Buffer> {
  const now = new Date().toLocaleDateString("el-GR");
  const createdDate = data.createdAt.toLocaleDateString("el-GR");
  const statusLabel = STATUS_LABELS[data.status] ?? data.status;

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
                  new TextRun({ text: "ΕΚΤΙΜΗΣΗ ΑΝΤΙΚΤΥΠΟΥ ΠΡΟΣΤΑΣΙΑΣ ΔΕΔΟΜΕΝΩΝ — GDPR Άρθρο 35", size: 16, color: "888888" }),
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
                  new TextRun({ text: `DPIA · ${data.title} · ${createdDate}`, size: 16, color: "888888" }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({ text: "ΕΚΤΙΜΗΣΗ ΑΝΤΙΚΤΥΠΟΥ", bold: true, size: 40, color: BLUE }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({ text: "ΠΡΟΣΤΑΣΙΑΣ ΔΕΔΟΜΕΝΩΝ (DPIA)", bold: true, size: 32, color: DARK }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({ text: "Κανονισμός (ΕΕ) 2016/679 — Άρθρο 35", size: 20, italics: true }),
            ],
          }),

          // Metadata
          h1("1. Στοιχεία DPIA"),
          field("Τίτλος", data.title),
          field("Project / Εφαρμογή", data.projectName),
          field("Δημιουργήθηκε από", data.createdBy),
          field("Ημερομηνία", createdDate),
          field("Κατάσταση", statusLabel),

          separator(),

          // Processing purpose
          h1("2. Σκοπός & Περιγραφή Επεξεργασίας"),
          body(data.processingPurpose),

          separator(),

          // Risk assessment table
          h1("3. Εκτίμηση Κινδύνου"),
          body("Ο παρακάτω πίνακας παρουσιάζει τους αναγνωρισμένους κινδύνους και τα αντίστοιχα μέτρα αντιμετώπισης:"),
          separator(),
          twoColTable(data.risksIdentified, data.riskMitigation),

          separator(),

          // Necessity & proportionality
          h1("4. Αναγκαιότητα & Αναλογικότητα"),
          body("Αξιολόγηση σύμφωνα με το Άρθρο 35 §7(b) GDPR:"),
          checkField("Η επεξεργασία έχει αξιολογηθεί ως αναγκαία και αναλογική προς τον σκοπό", data.necessityAssessed),
          ...(data.necessityAssessed
            ? [body("Η αξιολόγηση αναγκαιότητας και αναλογικότητας έχει ολοκληρωθεί με θετικό αποτέλεσμα.")]
            : [body("⚠ Η αξιολόγηση αναγκαιότητας εκκρεμεί — απαιτείται ολοκλήρωση πριν την έγκριση.")]),

          separator(),

          // DPO consultation
          h1("5. Γνώμη Υπευθύνου Προστασίας Δεδομένων (ΥΠΔ)"),
          body("Σύμφωνα με το Άρθρο 35 §2 GDPR, ο υπεύθυνος επεξεργασίας ζητά τη γνώμη του ΥΠΔ:"),
          checkField("Διαβούλευση με ΥΠΔ έχει πραγματοποιηθεί", data.dpoConsulted),
          ...(data.dpoConsulted && data.dpoName
            ? [field("Υπεύθυνος Προστασίας Δεδομένων", data.dpoName)]
            : []),

          separator(),

          // Supervisory body
          ...(data.supervisoryBody
            ? [
                h1("6. Εποπτική Αρχή"),
                field("Αρχή Προστασίας Δεδομένων", data.supervisoryBody),
                body("Σε περίπτωση που ο εναπομένων κίνδυνος είναι υψηλός, απαιτείται προηγούμενη διαβούλευση με την εποπτική αρχή (Άρθρο 36 GDPR)."),
                separator(),
              ]
            : [
                h1("6. Εποπτική Αρχή"),
                body("Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα (ΑΠΔΠΧ) — www.dpa.gr"),
                body("Σε περίπτωση που ο εναπομένων κίνδυνος είναι υψηλός, απαιτείται προηγούμενη διαβούλευση (Άρθρο 36 GDPR)."),
                separator(),
              ]),

          // Conclusion
          h1("7. Συμπέρασμα"),
          body(
            data.necessityAssessed && data.dpoConsulted
              ? "Η εκτίμηση αντικτύπου ολοκληρώθηκε. Τα μέτρα ασφαλείας κρίνονται επαρκή για τη μείωση των κινδύνων σε αποδεκτό επίπεδο."
              : "Η εκτίμηση αντικτύπου εκκρεμεί ολοκλήρωση. Παρακαλούμε βεβαιωθείτε ότι όλα τα βήματα έχουν ολοκληρωθεί πριν την έγκριση."
          ),

          separator(),
          separator(),

          // Signature block
          h1("Υπογραφές"),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ spacing: { before: 600 }, children: [new TextRun({ text: "_".repeat(40), size: 20 })] }),
                      new Paragraph({ children: [new TextRun({ text: "Υπεύθυνος Επεξεργασίας", size: 20, bold: true })] }),
                      new Paragraph({ children: [new TextRun({ text: "Ημερομηνία: _____ / _____ / _______", size: 18 })] }),
                    ],
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                  }),
                  new TableCell({
                    width: { size: 10, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ text: "" })],
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                  }),
                  new TableCell({
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ spacing: { before: 600 }, children: [new TextRun({ text: "_".repeat(40), size: 20 })] }),
                      new Paragraph({ children: [new TextRun({ text: data.dpoName ?? "Υπεύθυνος Προστασίας Δεδομένων", size: 20, bold: true })] }),
                      new Paragraph({ children: [new TextRun({ text: "Ημερομηνία: _____ / _____ / _______", size: 18 })] }),
                    ],
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                  }),
                ],
              }),
            ],
          }),

          separator(),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `GDPR Compliance OS · ${now}`, size: 16, color: "888888" }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
