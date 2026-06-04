import ExcelJS from "exceljs";

export interface ConsentExcelRecord {
  id: string;
  subjectEmail: string;
  subjectPhone: string | null;
  status: string;
  values: Record<string, unknown>;
  purposeConsents: Record<string, boolean>;
  confirmedAt: Date | null;
  ipAddress: string | null;
  createdAt: Date;
}

export interface ConsentExcelInput {
  projectName: string;
  fieldKeys: string[];
  purposeLabels: Record<string, string>;
  records: ConsentExcelRecord[];
}

export async function buildConsentExcel(input: ConsentExcelInput): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Consents");

  const purposeIds = Object.keys(input.purposeLabels);
  const columns: Partial<ExcelJS.Column>[] = [
    { header: "ID", key: "id", width: 24 },
    { header: "Email", key: "subjectEmail", width: 28 },
    { header: "Τηλέφωνο", key: "subjectPhone", width: 16 },
    { header: "Κατάσταση", key: "status", width: 14 },
    ...input.fieldKeys.map((k) => ({ header: k, key: `field_${k}`, width: 22 })),
    ...purposeIds.map((id) => ({ header: input.purposeLabels[id], key: `purpose_${id}`, width: 18 })),
    { header: "Επιβεβαίωση", key: "confirmedAt", width: 20 },
    { header: "IP", key: "ipAddress", width: 16 },
    { header: "Δημιουργία", key: "createdAt", width: 20 },
  ];
  ws.columns = columns;

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0078D4" } } as ExcelJS.Fill;

  for (const r of input.records) {
    const row: Record<string, unknown> = {
      id: r.id,
      subjectEmail: r.subjectEmail,
      subjectPhone: r.subjectPhone ?? "",
      status: r.status,
      confirmedAt: r.confirmedAt ? r.confirmedAt.toLocaleString("el-GR") : "",
      ipAddress: r.ipAddress ?? "",
      createdAt: r.createdAt.toLocaleString("el-GR"),
    };
    for (const k of input.fieldKeys) row[`field_${k}`] = (r.values?.[k] as string) ?? "";
    for (const id of purposeIds) row[`purpose_${id}`] = r.purposeConsents?.[id] ? "ΝΑΙ" : "ΟΧΙ";
    ws.addRow(row);
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
