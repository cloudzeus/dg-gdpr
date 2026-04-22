"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { MdSearch } from "react-icons/md";

interface OrgData {
  name: string;
  legalName: string;
  vatNumber: string;
  taxOffice: string;
  registryNo: string;
}

export function OrgVatFields({ org }: { org: Partial<OrgData & {
  addressLine1?: string; postalCode?: string; city?: string; country?: string;
}> | null }) {
  const [fields, setFields] = useState<OrgData>({
    name: org?.name ?? "",
    legalName: org?.legalName ?? "",
    vatNumber: org?.vatNumber ?? "",
    taxOffice: org?.taxOffice ?? "",
    registryNo: org?.registryNo ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof OrgData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((prev) => ({ ...prev, [key]: e.target.value }));

  async function lookup() {
    const afm = fields.vatNumber.trim();
    if (!/^\d{9}$/.test(afm)) { setError("Εισάγετε 9-ψήφιο ΑΦΜ"); return; }
    setLoading(true); setError(null); setInfo(null);
    try {
      const res = await fetch("/api/admin/vat-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ afm }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Σφάλμα"); return; }

      setFields((prev) => ({
        ...prev,
        name: data.name || prev.name,
        legalName: data.legalName || prev.legalName,
        taxOffice: data.taxOffice || prev.taxOffice,
      }));

      // Fill address fields in the Έδρα card via DOM (they live in the same form)
      const fill = (id: string, val: string) => {
        const el = document.getElementById(id) as HTMLInputElement | null;
        if (el && val) el.value = val;
      };
      fill("org-addressLine1", data.addressLine1);
      fill("org-postalCode", data.postalCode);
      fill("org-city", data.city);
      fill("org-country", data.country);

      setInfo(`${data.name}${data.legalStatus ? ` · ${data.legalStatus}` : ""}${!data.isActive ? " · ⚠ ΑΝΕΝΕΡΓΟΣ" : ""}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Row 1: names */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Εμπορική Επωνυμία *</label>
          <Input name="name" value={fields.name} onChange={set("name")} required />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Νομική Επωνυμία</label>
          <Input name="legalName" value={fields.legalName} onChange={set("legalName")} />
        </div>
      </div>

      {/* Row 2: ΑΦΜ + ΔΟΥ + ΓΕΜΗ */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">ΑΦΜ</label>
          <div className="flex gap-1.5">
            <Input
              name="vatNumber"
              value={fields.vatNumber}
              onChange={(e) => setFields((prev) => ({ ...prev, vatNumber: e.target.value.replace(/\D/g, "").slice(0, 9) }))}
              maxLength={9}
              className="font-mono"
              placeholder="9 ψηφία"
            />
            <button
              type="button"
              onClick={lookup}
              disabled={loading || fields.vatNumber.length !== 9}
              title="Αναζήτηση στοιχείων από ΓΓΔΕ"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors disabled:opacity-40"
              style={{ borderColor: "rgb(var(--border))", background: "rgba(0,120,212,0.08)", color: "#0078d4" }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MdSearch size={17} />}
            </button>
          </div>
          {error && <p className="text-[11px] text-destructive">{error}</p>}
          {info && <p className="text-[11px] font-medium" style={{ color: "#107c10" }}>✓ {info}</p>}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">ΔΟΥ</label>
          <Input name="taxOffice" value={fields.taxOffice} onChange={set("taxOffice")} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">ΓΕΜΗ</label>
          <Input name="registryNo" value={fields.registryNo} onChange={set("registryNo")} />
        </div>
      </div>
    </>
  );
}
