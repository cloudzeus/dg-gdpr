"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { getLicense } from "@/actions/license";
import { buildLicenseSections, type LicenseSection } from "@/lib/license-text";
import { LicenseEditor, type LicenseData } from "@/components/modules/license-editor";
import { FiEdit2, FiFileText } from "react-icons/fi";

export function LicenseModal({
  open,
  onClose,
  canEdit = false,
}: {
  open: boolean;
  onClose: () => void;
  canEdit?: boolean;
}) {
  const [license, setLicense] = useState<LicenseData | null>(null);
  const [sections, setSections] = useState<LicenseSection[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    // Super-admins open straight into the edit form; everyone else sees the text.
    setEditing(canEdit);
    getLicense()
      .then((lic) => {
        if (cancelled) return;
        const data: LicenseData = {
          serialNumber: lic?.serialNumber ?? null,
          sellerName: lic?.sellerName ?? null,
          sellerVat: lic?.sellerVat ?? null,
          buyerName: lic?.buyerName ?? null,
          buyerVat: lic?.buyerVat ?? null,
        };
        setLicense(data);
        setSections(buildLicenseSections(data));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, canEdit]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Άδεια Χρήσης Λογισμικού"
      description={canEdit ? "Καταχώρηση στοιχείων άδειας & προβολή όρων" : "Όροι άδειας χρήσης της εφαρμογής"}
      size="xl"
    >
      {loading || !sections ? (
        <p className="text-sm text-muted-foreground">Φόρτωση…</p>
      ) : editing && canEdit ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Συμπληρώστε τον αριθμό σειράς και τα στοιχεία της πωλήτριας και της αγοράστριας εταιρίας.
          </p>
          <LicenseEditor license={license} />
          <div className="pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="inline-flex items-center gap-1.5 text-sm text-[rgb(0,120,212)] hover:underline"
            >
              <FiFileText className="h-3.5 w-3.5" /> Προβολή κειμένου άδειας χρήσης
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5 text-sm leading-relaxed">
          {canEdit && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-sm px-3 h-8 text-sm font-semibold text-white"
                style={{ background: "rgb(0,120,212)" }}
              >
                <FiEdit2 className="h-3.5 w-3.5" /> Επεξεργασία στοιχείων
              </button>
            </div>
          )}
          {sections.map((s, i) => (
            <section key={i}>
              <h3 className="font-semibold mb-1.5">{s.title}</h3>
              {s.paragraphs.map((p, j) => (
                <p key={j} className="text-muted-foreground mb-1.5">{p}</p>
              ))}
            </section>
          ))}
        </div>
      )}
    </Modal>
  );
}
