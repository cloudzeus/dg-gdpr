"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface Props {
  score: number;
  grade: string;
  chartData: { label: string; score: number }[];
}

export function PdfExportButton({ score, grade, chartData }: Props) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // Header
      doc.setFillColor(0, 120, 212);
      doc.rect(0, 0, 210, 30, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("GDPR Compliance Report", 15, 18);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Ημερομηνία: ${new Date().toLocaleDateString("el-GR")}`, 140, 12);
      doc.text("DG Smart — GDPR Compliance OS", 140, 18);

      // Score
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Συνολική Βαθμολογία Συμμόρφωσης", 15, 45);

      doc.setFontSize(36);
      doc.setTextColor(0, 120, 212);
      doc.text(`${score}%`, 15, 62);
      doc.setFontSize(14);
      doc.setTextColor(100, 100, 100);
      doc.text(grade, 55, 62);

      // Table
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Ανάλυση ανά Τομέα", 15, 80);

      autoTable(doc, {
        startY: 85,
        head: [["Τομέας Συμμόρφωσης", "Βαθμολογία", "Αξιολόγηση"]],
        body: chartData.map((d) => [
          d.label,
          `${d.score}%`,
          d.score >= 90 ? "Άριστο" : d.score >= 75 ? "Καλό" : d.score >= 60 ? "Μέτριο" : d.score >= 40 ? "Ανεπαρκές" : "Κρίσιμο",
        ]),
        headStyles: { fillColor: [0, 120, 212], textColor: 255, fontSize: 10 },
        bodyStyles: { fontSize: 10 },
        alternateRowStyles: { fillColor: [240, 245, 255] },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 15;

      // GDPR note
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text("Αυτή η αναφορά παράχθηκε αυτόματα από το GDPR Compliance OS βάσει των ολοκληρωμένων αξιολογήσεων.", 15, finalY);
      doc.text("Άρθρο 5(2) GDPR — Αρχή Λογοδοσίας: ο υπεύθυνος επεξεργασίας είναι σε θέση να αποδείξει τη συμμόρφωσή του.", 15, finalY + 6);

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Εμπιστευτικό — GDPR Compliance OS © DG Smart", 15, 285);
      doc.text(`Σελίδα 1 από 1`, 175, 285);

      doc.save(`gdpr-compliance-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={loading} className="gap-2">
      <Download className="h-4 w-4" />
      {loading ? "Δημιουργία PDF..." : "Εξαγωγή PDF"}
    </Button>
  );
}
