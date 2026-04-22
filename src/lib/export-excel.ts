import ExcelJS from "exceljs";

export async function buildErasureExcel(
  requests: {
    subjectName: string;
    subjectEmail: string;
    subjectPhone: string | null;
    requestDate: Date;
    status: string;
    description: string;
    systems: unknown;
    assignedTo: string | null;
    completedAt: Date | null;
    notes: string | null;
  }[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "GDPR OS";
  wb.created = new Date();

  const ws = wb.addWorksheet("Αιτήματα Διαγραφής");

  // Header style
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0078D4" },
  };
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };

  ws.columns = [
    { header: "Ονοματεπώνυμο", key: "name", width: 25 },
    { header: "Email", key: "email", width: 30 },
    { header: "Τηλέφωνο", key: "phone", width: 18 },
    { header: "Ημ. Αιτήματος", key: "requestDate", width: 18 },
    { header: "Κατάσταση", key: "status", width: 18 },
    { header: "Περιγραφή", key: "description", width: 40 },
    { header: "Συστήματα", key: "systems", width: 30 },
    { header: "Ανατέθηκε σε", key: "assignedTo", width: 20 },
    { header: "Ολοκληρώθηκε", key: "completedAt", width: 18 },
    { header: "Σημειώσεις", key: "notes", width: 40 },
  ];

  // Style header row
  ws.getRow(1).eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      bottom: { style: "medium", color: { argb: "FF005A9E" } },
    };
  });

  const STATUS_LABELS: Record<string, string> = {
    PENDING: "Εκκρεμεί",
    IN_PROGRESS: "Σε Εξέλιξη",
    COMPLETED: "Ολοκληρώθηκε",
    REJECTED: "Απορρίφθηκε",
    PARTIAL: "Μερική Διαγραφή",
  };

  requests.forEach((r) => {
    const row = ws.addRow({
      name: r.subjectName,
      email: r.subjectEmail,
      phone: r.subjectPhone ?? "",
      requestDate: r.requestDate,
      status: STATUS_LABELS[r.status] ?? r.status,
      description: r.description,
      systems: Array.isArray(r.systems) ? (r.systems as string[]).join(", ") : "",
      assignedTo: r.assignedTo ?? "",
      completedAt: r.completedAt ?? "",
      notes: r.notes ?? "",
    });

    // Color by status
    const statusColor =
      r.status === "COMPLETED" ? "FFE6F4EA" :
      r.status === "REJECTED" ? "FFFDE7E9" :
      r.status === "PENDING" ? "FFFFF8E1" : "FFFFFFFF";

    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: statusColor } };
      cell.alignment = { wrapText: true, vertical: "top" };
      cell.font = { size: 10 };
    });
  });

  ws.getRow(1).height = 20;
  ws.autoFilter = { from: "A1", to: "J1" };

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function buildAuditExcel(
  logs: {
    createdAt: Date;
    action: string;
    entity: string;
    entityId: string | null;
    user: { name: string | null; email: string | null };
  }[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "GDPR OS";

  const ws = wb.addWorksheet("Αρχείο Ελέγχου");

  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0078D4" },
  };

  ws.columns = [
    { header: "Ημερομηνία", key: "date", width: 20 },
    { header: "Ενέργεια", key: "action", width: 15 },
    { header: "Οντότητα", key: "entity", width: 20 },
    { header: "ID", key: "entityId", width: 28 },
    { header: "Χρήστης", key: "user", width: 25 },
    { header: "Email", key: "email", width: 30 },
  ];

  ws.getRow(1).eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  logs.forEach((log) => {
    ws.addRow({
      date: log.createdAt,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId ?? "",
      user: log.user.name ?? "—",
      email: log.user.email ?? "—",
    }).eachCell((cell) => {
      cell.font = { size: 10 };
      cell.alignment = { vertical: "top" };
    });
  });

  ws.autoFilter = { from: "A1", to: "F1" };

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function buildTrainingExcel(
  results: {
    user: { name: string | null; email: string | null; department: { name: string } | null };
    module: { title: string };
    score: number;
    passed: boolean;
    completedAt: Date;
    retryCount: number;
  }[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "GDPR OS";

  const ws = wb.addWorksheet("Εκπαιδεύσεις");

  ws.columns = [
    { header: "Εργαζόμενος", key: "name", width: 25 },
    { header: "Email", key: "email", width: 30 },
    { header: "Τμήμα", key: "dept", width: 22 },
    { header: "Ενότητα", key: "module", width: 35 },
    { header: "Βαθμολογία", key: "score", width: 14 },
    { header: "Αποτέλεσμα", key: "passed", width: 14 },
    { header: "Ημ. Εξέτασης", key: "date", width: 18 },
    { header: "Αρ. Απόπειρας", key: "retry", width: 14 },
  ];

  ws.getRow(1).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0078D4" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  results.forEach((r) => {
    const row = ws.addRow({
      name: r.user.name ?? "—",
      email: r.user.email ?? "—",
      dept: r.user.department?.name ?? "—",
      module: r.module.title,
      score: `${Math.round(r.score)}%`,
      passed: r.passed ? "✓ Πέρασε" : "✗ Απέτυχε",
      date: r.completedAt,
      retry: r.retryCount + 1,
    });

    const color = r.passed ? "FFE6F4EA" : "FFFDE7E9";
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
      cell.font = { size: 10 };
    });
  });

  ws.autoFilter = { from: "A1", to: "H1" };

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
