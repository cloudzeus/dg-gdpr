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
  UnderlineType,
  PageBreak,
  Footer,
  Header,
} from "docx";

export interface DpaTemplateData {
  controllerName: string;
  controllerAddress?: string;
  controllerRep?: string;
  controllerEmail?: string;
  processorName: string;
  processorAddress?: string;
  processorRep?: string;
  processorEmail?: string;
  title: string;
  dataCategories: string[];
  purposes: string[];
  retentionPeriod: string;
  safeguards?: string;
  subProcessors?: string[];
  signedAt?: Date;
  gdprArticles?: string;
}

const BLUE = "0078D4";
const DARK = "1F3F5E";

function h1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [
      new TextRun({ text, bold: true, size: 28, color: BLUE }),
    ],
  });
}

function h2(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
    children: [
      new TextRun({ text, bold: true, size: 24, color: DARK }),
    ],
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

function bullet(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, size: 20 })],
  });
}

function separator(): Paragraph {
  return new Paragraph({ spacing: { before: 200, after: 200 }, children: [new TextRun({ text: "" })] });
}

function signatureBlock(label: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 45, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            spacing: { before: 600 },
            children: [new TextRun({ text: "_".repeat(40), size: 20 })],
          }),
          new Paragraph({ children: [new TextRun({ text: label, size: 20, bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: "Υπογραφή — Σφραγίδα", size: 18, color: "888888" })] }),
          new Paragraph({ children: [new TextRun({ text: "Ημερομηνία: _____ / _____ / _______", size: 18 })] }),
        ],
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
        },
      }),
      new TableCell({
        width: { size: 10, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ text: "" })],
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
        },
      }),
      new TableCell({
        width: { size: 45, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            spacing: { before: 600 },
            children: [new TextRun({ text: "_".repeat(40), size: 20 })],
          }),
          new Paragraph({ children: [new TextRun({ text: "Εκτελών την Επεξεργασία", size: 20, bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: "Υπογραφή — Σφραγίδα", size: 18, color: "888888" })] }),
          new Paragraph({ children: [new TextRun({ text: "Ημερομηνία: _____ / _____ / _______", size: 18 })] }),
        ],
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
        },
      }),
    ],
  });
}

export async function buildDpaWord(data: DpaTemplateData): Promise<Buffer> {
  const now = new Date().toLocaleDateString("el-GR");
  const signDate = data.signedAt ? data.signedAt.toLocaleDateString("el-GR") : now;

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
                  new TextRun({ text: "ΣYMBAΣΗ ΕΠΕΞΕΡΓΑΣΙΑΣ ΔΕΔΟΜΕΝΩΝ — GDPR Άρθρο 28", size: 16, color: "888888" }),
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
                  new TextRun({ text: `Σύμβαση DPA · ${data.controllerName} & ${data.processorName} · ${signDate}`, size: 16, color: "888888" }),
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
              new TextRun({ text: "ΣΥΜΒΑΣΗ ΕΠΕΞΕΡΓΑΣΙΑΣ ΔΕΔΟΜΕΝΩΝ", bold: true, size: 40, color: BLUE }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({ text: "(Data Processing Agreement — DPA)", size: 24, color: "666666" }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({ text: `Κανονισμός (ΕΕ) 2016/679 — Άρθρο 28`, size: 20, italics: true }),
            ],
          }),

          // Parties
          h1("ΆΡΘΡΟ 1: Μέρη της Σύμβασης"),

          h2("Υπεύθυνος Επεξεργασίας (Controller)"),
          field("Επωνυμία", data.controllerName),
          field("Διεύθυνση", data.controllerAddress ?? "—"),
          field("Εκπρόσωπος", data.controllerRep ?? "—"),
          field("Email", data.controllerEmail ?? "—"),

          separator(),

          h2("Εκτελών την Επεξεργασία (Processor)"),
          field("Επωνυμία", data.processorName),
          field("Διεύθυνση", data.processorAddress ?? "—"),
          field("Εκπρόσωπος", data.processorRep ?? "—"),
          field("Email", data.processorEmail ?? "—"),

          separator(),

          // Subject
          h1("ΆΡΘΡΟ 2: Αντικείμενο & Σκοπός Επεξεργασίας"),
          field("Τίτλος Σύμβασης", data.title),
          body("Ο Εκτελών την Επεξεργασία αναλαμβάνει να επεξεργάζεται δεδομένα προσωπικού χαρακτήρα εκ μέρους του Υπεύθυνου Επεξεργασίας, σύμφωνα με τους παρακάτω όρους και τις διατάξεις του Κανονισμού (ΕΕ) 2016/679 (GDPR)."),

          h2("Σκοποί Επεξεργασίας"),
          ...data.purposes.map(bullet),

          separator(),

          // Data categories
          h1("ΆΡΘΡΟ 3: Κατηγορίες Δεδομένων"),
          body("Τα δεδομένα προσωπικού χαρακτήρα που αποτελούν αντικείμενο επεξεργασίας περιλαμβάνουν:"),
          ...data.dataCategories.map(bullet),

          separator(),

          // Retention
          h1("ΆΡΘΡΟ 4: Διάρκεια & Διατήρηση"),
          field("Χρόνος Διατήρησης", data.retentionPeriod),
          body("Μετά τη λήξη της σύμβασης ή κατόπιν αιτήματος, ο Εκτελών θα διαγράψει ή θα επιστρέψει τα δεδομένα, εκτός εάν απαιτείται διατήρηση από νόμο."),

          separator(),

          // Obligations of processor
          h1("ΆΡΘΡΟ 5: Υποχρεώσεις Εκτελούντος"),
          ...[
            "Επεξεργάζεται τα δεδομένα μόνο κατόπιν τεκμηριωμένης εντολής του Υπεύθυνου.",
            "Διασφαλίζει ότι τα πρόσωπα που επεξεργάζονται τα δεδομένα έχουν δεσμευθεί για εμπιστευτικότητα.",
            "Εφαρμόζει κατάλληλα τεχνικά και οργανωτικά μέτρα ασφαλείας (Άρθρο 32 GDPR).",
            "Δεν αναθέτει δευτερεύουσα επεξεργασία χωρίς γραπτή άδεια του Υπεύθυνου.",
            "Συνδράμει τον Υπεύθυνο στην άσκηση δικαιωμάτων των υποκειμένων (Άρθρα 15-22 GDPR).",
            "Ειδοποιεί τον Υπεύθυνο για κάθε παραβίαση εντός 72 ωρών.",
            "Παρέχει κάθε απαραίτητη πληροφορία για την απόδειξη συμμόρφωσης.",
          ].map(bullet),

          separator(),

          // Safeguards
          h1("ΆΡΘΡΟ 6: Μέτρα Ασφαλείας"),
          body(data.safeguards ?? "Εφαρμόζονται τεχνικά και οργανωτικά μέτρα ασφαλείας σύμφωνα με το Άρθρο 32 GDPR, συμπεριλαμβανομένης της κρυπτογράφησης, της ψευδωνυμοποίησης, και τακτικών δοκιμών ασφαλείας."),

          separator(),

          // Sub-processors
          h1("ΆΡΘΡΟ 7: Υποεκτελούντες"),
          ...(data.subProcessors && data.subProcessors.length > 0
            ? [
                body("Ο Εκτελών έχει λάβει γενική άδεια για χρήση των παρακάτω υποεκτελούντων:"),
                ...data.subProcessors.map(bullet),
                body("Κάθε νέος υποεκτελών απαιτεί γραπτή έγκριση και υπογραφή ανάλογης σύμβασης."),
              ]
            : [body("Δεν χρησιμοποιούνται υποεκτελούντες χωρίς γραπτή άδεια του Υπεύθυνου.")]),

          separator(),

          // Liability
          h1("ΆΡΘΡΟ 8: Ευθύνη & Αποζημίωση"),
          body("Σε περίπτωση παραβίασης από τον Εκτελούντα, αυτός φέρει πλήρη ευθύνη έναντι του Υπεύθυνου για κάθε ζημία που προκύπτει. Ισχύουν οι διατάξεις των Άρθρων 82-84 GDPR."),

          separator(),

          // Termination
          h1("ΆΡΘΡΟ 9: Λύση Σύμβασης"),
          body("Η σύμβαση λύεται με αμοιβαία γραπτή συμφωνία ή με καταγγελία 30 ημερών. Κατά τη λύση, ο Εκτελών υποχρεούται σε αφαίρεση όλων των δεδομένων εντός 30 ημερών."),

          separator(),

          // Governing law
          h1("ΆΡΘΡΟ 10: Εφαρμοστέο Δίκαιο"),
          body("Η παρούσα σύμβαση διέπεται από το δίκαιο της Ελληνικής Δημοκρατίας. Αρμόδια δικαστήρια ορίζονται τα δικαστήρια της Αθήνας. Εφαρμόζεται ο Κανονισμός (ΕΕ) 2016/679."),

          separator(),
          separator(),

          // Signatures
          h1("ΥΠΟΓΡΑΦΕΣ"),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [signatureBlock(data.controllerName)],
          }),

          separator(),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Αθήνα, ${signDate} — GDPR Compliance OS`,
                size: 16,
                color: "888888",
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
