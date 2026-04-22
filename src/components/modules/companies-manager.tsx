"use client";

import { useState, useTransition, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { CommandBar, CommandBarButton, CommandBarSeparator } from "@/components/shared/command-bar";
import { createCompany, updateCompany, deleteCompany } from "@/actions/companies";
import { Plus, Pencil, Trash2, Search, FileText } from "lucide-react";

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

const RELATIONSHIPS = [
  { value: "CLIENT", label: "Πελάτης", variant: "success" as const },
  { value: "SUPPLIER", label: "Προμηθευτής", variant: "warning" as const },
  { value: "PARTNER", label: "Συνεργάτης", variant: "default" as const },
  { value: "SUBSIDIARY", label: "Θυγατρική", variant: "secondary" as const },
  { value: "OTHER", label: "Άλλο", variant: "secondary" as const },
];

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

  const handleSubmit = (id: string | null) => async (fd: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        if (id) await updateCompany(id, fd);
        else await createCompany(fd);
        setEditing(null);
        setCreating(false);
      } catch (e: any) {
        setError(e.message ?? "Σφάλμα");
      }
    });
  };

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

      <Modal
        open={creating || editing !== null}
        onClose={() => { setCreating(false); setEditing(null); }}
        title={editing ? "Επεξεργασία Εταιρείας" : "Νέα Εταιρεία"}
      >
        <form action={handleSubmit(editing?.id ?? null)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Επωνυμία *"><Input name="name" defaultValue={editing?.name ?? ""} required autoFocus /></Field>
            <Field label="Νομική Επωνυμία"><Input name="legalName" defaultValue={editing?.legalName ?? ""} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="ΑΦΜ"><Input name="vatNumber" defaultValue={editing?.vatNumber ?? ""} /></Field>
            <Field label="ΔΟΥ"><Input name="taxOffice" defaultValue={editing?.taxOffice ?? ""} /></Field>
            <Field label="ΓΕΜΗ"><Input name="registryNo" defaultValue={editing?.registryNo ?? ""} /></Field>
          </div>
          <Field label="Σχέση (πολλαπλή επιλογή)">
            <div className="flex gap-3 flex-wrap py-1">
              {RELATIONSHIPS.map((r) => (
                <label key={r.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    name="relationship"
                    value={r.value}
                    defaultChecked={editing?.relationships.includes(r.value) ?? false}
                  /> {r.label}
                </label>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email"><Input type="email" name="email" defaultValue={editing?.email ?? ""} /></Field>
            <Field label="Τηλέφωνο"><Input name="phone" defaultValue={editing?.phone ?? ""} /></Field>
          </div>
          <Field label="Website"><Input name="website" defaultValue={editing?.website ?? ""} /></Field>
          <Field label="Διεύθυνση"><Input name="addressLine1" defaultValue={editing?.addressLine1 ?? ""} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Πόλη"><Input name="city" defaultValue={editing?.city ?? ""} /></Field>
            <Field label="ΤΚ"><Input name="postalCode" defaultValue={editing?.postalCode ?? ""} /></Field>
            <Field label="Χώρα"><Input name="country" defaultValue={editing?.country ?? "Ελλάδα"} /></Field>
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Υπεύθυνος Επικοινωνίας</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Όνομα"><Input name="contactName" defaultValue={editing?.contactName ?? ""} /></Field>
              <Field label="Email"><Input type="email" name="contactEmail" defaultValue={editing?.contactEmail ?? ""} /></Field>
              <Field label="Τηλέφωνο"><Input name="contactPhone" defaultValue={editing?.contactPhone ?? ""} /></Field>
            </div>
          </div>
          <Field label="Σημειώσεις">
            <textarea name="notes" defaultValue={editing?.notes ?? ""} rows={2}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} />
            Ενεργή συνεργασία
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { setCreating(false); setEditing(null); }}>Ακύρωση</Button>
            <Button type="submit" disabled={isPending}>Αποθήκευση</Button>
          </div>
        </form>
      </Modal>
    </div>
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
