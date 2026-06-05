"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { getLicense } from "@/actions/license";
import { buildLicenseSections, type LicenseSection } from "@/lib/license-text";

export function LicenseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [sections, setSections] = useState<LicenseSection[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    getLicense()
      .then((lic) => {
        if (cancelled) return;
        setSections(
          buildLicenseSections({
            serialNumber: lic?.serialNumber ?? null,
            sellerName: lic?.sellerName ?? null,
            sellerVat: lic?.sellerVat ?? null,
            buyerName: lic?.buyerName ?? null,
            buyerVat: lic?.buyerVat ?? null,
          })
        );
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Άδεια Χρήσης Λογισμικού"
      description="Όροι άδειας χρήσης της εφαρμογής"
      size="xl"
    >
      {loading || !sections ? (
        <p className="text-sm text-muted-foreground">Φόρτωση…</p>
      ) : (
        <div className="space-y-5 text-sm leading-relaxed">
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
