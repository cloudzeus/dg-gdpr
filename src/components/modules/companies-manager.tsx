"use client";

import { useState, useTransition, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { CommandBar, CommandBarButton, CommandBarSeparator } from "@/components/shared/command-bar";
import { createCompany, updateCompany, deleteCompany } from "@/actions/companies";
import { Plus, Pencil, Trash2, Search, FileText, Loader2 } from "lucide-react";
import { MdSearch } from "react-icons/md";

type Company = {
  id: string;
  name: string;
  legalName: string | null;
  vatNumber: string | null;
  taxOffice: string | null;
  registryNo: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  relationships: string[];
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  isActive: boolean;
  dpaCount: number;
};

type VatData = {
  afm: string;
  name: string;
  legalName: string;
  taxOffice: string;
  legalStatus: string;
  addressLine1: string;
  postalCode: string;
  city: string;
  country: string;
  isActive: boolean;
  registDate: string | null;
  activities: string[];
};

const RELATIONSHIPS = [
  { value: "CLIENT", label: "Πελάτης", variant: "success" as const },
  { value: "SUPPLIER", label: "Προμηθευτής", variant: "warning" as const },
  { value: "PARTNER", label: "Συνεργάτης", variant: "default" as const },
  { value: "SUBSIDIARY", label: "Θυγατρική", variant: "secondary" as const },
  { value: "OTHER", label: "Άλλο", variant: "secondary" as const },
];

function emptyForm(c?: Company | null) {
  return {
    name: c?.name ?? "",
    legalName: c?.legalName ?? "",
    vatNumber: c?.vatNumber ?? "",
    taxOffice: c?.taxOffice ?? "",
    registryNo: c?.registryNo ?? "",
    email: c?.email ?? "",
    phone: c?.phone ?? "",
    website: c?.website ?? "",
    addressLine1: c?.addressLine1 ?? "",
    addressLine2: c?.addressLine2 ?? "",
    city: c?.city ?? "",
    postalCode: c?.postalCode ?? "",
    country: c?.country ?? "Ελλάδα",
    contactName: c?.contactName ?? "",
    contactEmail: c?.contactEmail ?? "",
    contactPhone: c?.contactPhone ?? "",
    notes: c?.notes ?? "",
    isActive: c?.isActive ?? true,
    relationships: c?.relationships ?? [],
  };
}

export function CompaniesManager({ companies }: { companies: Company[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("ALL");
  const [editing, setEditing] = useState<Company | null>(null);
  const [creating, setCreating] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return companies.filter((c) => {
      if (filter !== "ALL" && !c.relationships.includes(filter)) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.vatNumber ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [companies, query, filter]);

  const handleDelete = (c: Company) => {
    if (!confirm(`Διαγραφή εταιρείας "${c.name}";`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteCompany(c.id);
      } catch (e: any) {
        setError(e.message ?? "Σφάλμα");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <CommandBar>
          <CommandBarButton icon={Plus} label="Νέα Εταιρεία" variant="primary" onClick={() => setCreating(true)} />
          <CommandBarSeparator />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="text-xs bg-transparent outline-none px-2 py-1 rounded">
            <option value="ALL">Όλες οι σχέσεις</option>
            {RELATIONSHIPS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <CommandBarSeparator />
          <div className="flex items-center gap-1.5 px-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Αναζήτηση..." className="w-48 bg-transparent text-xs outline-none" />
          </div>
        </CommandBar>
        <span className="text-xs text-muted-foreground">{filtered.length} / {companies.length}</span>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-xs uppercase text-muted-foreground">
                <th className="px-4 py-2 text-left font-semibold">Επωνυμία</th>
                <th className="px-4 py-2 text-left font-semibold">ΑΦΜ</th>
                <th className="px-4 py-2 text-left font-semibold">Σχέση</th>
                <th className="px-4 py-2 text-left font-semibold">Επικοινωνία</th>
                <th className="px-4 py-2 text-center font-semibold">DPAs</th>
                <th className="px-4 py-2 text-right font-semibold">Ενέργειες</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border hover:bg-secondary/30">
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{c.name}</p>
                    {c.legalName && <p className="text-xs text-muted-foreground">{c.legalName}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-xs">{c.vatNumber ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1 flex-wrap">
                      {c.relationships.map((r) => {
                        const meta = RELATIONSHIPS.find((x) => x.value === r);
                        return <Badge key={r} variant={meta?.variant ?? "secondary"}>{meta?.label ?? r}</Badge>;
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {c.email && <div>{c.email}</div>}
                    {c.phone && <div>{c.phone}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <Badge variant="secondary"><FileText className="h-3 w-3 mr-1 inline" />{c.dpaCount}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(c)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {(creating || editing !== null) && (
        <CompanyModal
          editing={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); }}
          onError={(msg) => setError(msg)}
        />
      )}
    </div>
  );
}

function CompanyModal({
  editing,
  onClose,
  onSaved,
  onError,
}: {
  editing: Company | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState(() => emptyForm(editing));
  const [vatInput, setVatInput] = useState(editing?.vatNumber ?? "");
  const [vatLoading, setVatLoading] = useState(false);
  const [vatError, setVatError] = useState<string | null>(null);
  const [vatInfo, setVatInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const toggleRel = (val: string) =>
    setForm((prev) => ({
      ...prev,
      relationships: prev.relationships.includes(val)
        ? prev.relationships.filter((r) => r !== val)
        : [...prev.relationships, val],
    }));

  async function lookupVat() {
    const afm = vatInput.trim();
    if (!/^\d{9}$/.test(afm)) { setVatError("Εισάγετε 9 ψηφία ΑΦΜ"); return; }
    setVatLoading(true);
    setVatError(null);
    setVatInfo(null);
    try {
      const res = await fetch("/api/admin/vat-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ afm }),
      });
      const data: VatData & { error?: string } = await res.json();
      if (!res.ok) { setVatError(data.error ?? "Σφάλμα"); return; }

      setForm((prev) => ({
        ...prev,
        vatNumber: data.afm,
        name: data.name || prev.name,
        legalName: data.legalName || prev.legalName,
        taxOffice: data.taxOffice || prev.taxOffice,
        addressLine1: data.addressLine1 || prev.addressLine1,
        postalCode: data.postalCode || prev.postalCode,
        city: data.city || prev.city,
        country: data.country || prev.country,
        notes: [
          prev.notes,
          data.legalStatus ? `Νομική μορφή: ${data.legalStatus}` : "",
          data.registDate ? `Ημ. εγγραφής: ${data.registDate}` : "",
        ].filter(Boolean).join("\n").trim(),
      }));
      setVatInput(data.afm);
      setVatInfo(`${data.name} · ${data.legalStatus}${!data.isActive ? " · ⚠ ΑΝΕΝΕΡΓΟΣ ΑΦΜ" : ""}`);
    } catch (e: any) {
      setVatError(e.message);
    } finally {
      setVatLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError("Η επωνυμία είναι υποχρεωτική"); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (k === "relationships") {
        (v as string[]).forEach((r) => fd.append("relationship", r));
      } else {
        fd.append(k, String(v));
      }
    });
    setFormError(null);
    startTransition(async () => {
      try {
        if (editing) await updateCompany(editing.id, fd);
        else await createCompany(fd);
        onSaved();
      } catch (e: any) {
        setFormError(e.message ?? "Σφάλμα");
        onError(e.message ?? "Σφάλμα");
      }
    });
  };

  return (
    <Modal open onClose={onClose} title={editing ? "Επεξεργασία Εταιρείας" : "Νέα Εταιρεία"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-3">

        {/* VAT Lookup */}
        <div className="rounded-sm p-3 space-y-2" style={{ background: "rgba(0,120,212,0.05)", border: "1px solid rgba(0,120,212,0.18)" }}>
          <p className="text-xs font-semibold" style={{ color: "#0078d4" }}>Αυτόματη συμπλήρωση από ΑΦΜ (ΓΓΔΕ)</p>
          <div className="flex gap-2">
            <Input
              value={vatInput}
              onChange={(e) => setVatInput(e.target.value.replace(/\D/g, "").slice(0, 9))}
              placeholder="9-ψήφιο ΑΦΜ"
              maxLength={9}
              className="w-40 font-mono"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); lookupVat(); } }}
            />
            <Button
              type="button"
              onClick={lookupVat}
              disabled={vatLoading || vatInput.length !== 9}
              style={{ background: "#0078d4", color: "white", minWidth: 120 }}
            >
              {vatLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><MdSearch size={15} className="mr-1" />Αναζήτηση</>}
            </Button>
          </div>
          {vatError && <p className="text-xs text-destructive">{vatError}</p>}
          {vatInfo && <p className="text-xs font-medium" style={{ color: "#107c10" }}>✓ {vatInfo}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Επωνυμία / Εμπορικό Τίτλο *"><Input value={form.name} onChange={set("name")} required autoFocus /></Field>
          <Field label="Πλήρης Νομική Επωνυμία"><Input value={form.legalName} onChange={set("legalName")} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="ΑΦΜ"><Input value={form.vatNumber} onChange={set("vatNumber")} /></Field>
          <Field label="ΔΟΥ"><Input value={form.taxOffice} onChange={set("taxOffice")} /></Field>
          <Field label="ΓΕΜΗ"><Input value={form.registryNo} onChange={set("registryNo")} /></Field>
        </div>
        <Field label="Σχέση (πολλαπλή επιλογή)">
          <div className="flex gap-3 flex-wrap py-1">
            {RELATIONSHIPS.map((r) => (
              <label key={r.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.relationships.includes(r.value)}
                  onChange={() => toggleRel(r.value)}
                /> {r.label}
              </label>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email"><Input type="email" value={form.email} onChange={set("email")} /></Field>
          <Field label="Τηλέφωνο"><Input value={form.phone} onChange={set("phone")} /></Field>
        </div>
        <Field label="Website"><Input value={form.website} onChange={set("website")} /></Field>
        <Field label="Διεύθυνση"><Input value={form.addressLine1} onChange={set("addressLine1")} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Πόλη"><Input value={form.city} onChange={set("city")} /></Field>
          <Field label="ΤΚ"><Input value={form.postalCode} onChange={set("postalCode")} /></Field>
          <Field label="Χώρα"><Input value={form.country} onChange={set("country")} /></Field>
        </div>
        <div className="border-t border-border pt-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Υπεύθυνος Επικοινωνίας</p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Όνομα"><Input value={form.contactName} onChange={set("contactName")} /></Field>
            <Field label="Email"><Input type="email" value={form.contactEmail} onChange={set("contactEmail")} /></Field>
            <Field label="Τηλέφωνο"><Input value={form.contactPhone} onChange={set("contactPhone")} /></Field>
          </div>
        </div>
        <Field label="Σημειώσεις">
          <textarea
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            rows={2}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
          />
          Ενεργή συνεργασία
        </label>

        {formError && <p className="text-sm text-destructive">{formError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Ακύρωση</Button>
          <Button type="submit" disabled={isPending}>Αποθήκευση</Button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
