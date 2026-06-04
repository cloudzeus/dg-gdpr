"use client";

import { useState } from "react";
import {
  Plus, Trash2, Sparkles, Loader2, ShieldAlert, Search, Languages, Info,
} from "lucide-react";
import {
  createPersonalDataField,
  updatePersonalDataField,
  deletePersonalDataField,
} from "@/actions/consent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { loc, type LocalizedText } from "@/lib/localized";

interface Suggestion { basis: string; rationale: LocalizedText }
interface FieldRow {
  id: string;
  key: string;
  label: LocalizedText;
  description: LocalizedText;
  category: string;
  isSpecialCategory: boolean;
  inputType: string;
  suggestedLegalBasis: unknown;
}

const CATEGORIES = ["IDENTITY", "CONTACT", "FINANCIAL", "HEALTH", "ONLINE", "OTHER"];
const CATEGORY_LABELS: Record<string, string> = {
  IDENTITY: "Ταυτότητα", CONTACT: "Επικοινωνία", FINANCIAL: "Οικονομικά",
  HEALTH: "Υγεία", ONLINE: "Διαδικτυακά", OTHER: "Άλλο",
};
const INPUT_TYPES = ["TEXT", "EMAIL", "PHONE", "DATE", "NUMBER", "TEXTAREA"];
const INPUT_LABELS: Record<string, string> = {
  TEXT: "Κείμενο", EMAIL: "Email", PHONE: "Τηλέφωνο", DATE: "Ημερομηνία",
  NUMBER: "Αριθμός", TEXTAREA: "Κείμενο (πολλές γραμμές)",
};
const BASIS_LABELS: Record<string, string> = {
  CONSENT: "Συγκατάθεση", CONTRACT: "Σύμβαση", LEGAL_OBLIGATION: "Νομική υποχρέωση",
  VITAL_INTEREST: "Ζωτικό συμφέρον", PUBLIC_TASK: "Δημόσιο συμφέρον", LEGITIMATE_INTEREST: "Έννομο συμφέρον",
};

function asSuggestions(v: unknown): Suggestion[] {
  return Array.isArray(v) ? (v as Suggestion[]) : [];
}

function SectionCard({ icon: Icon, title, hint, children }: {
  icon: React.ComponentType<{ className?: string }>; title: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
      <header className="flex items-start gap-3 border-b border-neutral-100 px-5 py-4">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[#0078d4]">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-neutral-800">{title}</h2>
          {hint && <p className="mt-0.5 text-xs text-neutral-500">{hint}</p>}
        </div>
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

export function FieldsManager({ initialFields }: { initialFields: FieldRow[] }) {
  const [fields, setFields] = useState<FieldRow[]>(initialFields);
  const [draft, setDraft] = useState({
    key: "", labelEl: "", labelEn: "", descEl: "", descEn: "",
    category: "OTHER", inputType: "TEXT", isSpecialCategory: false,
  });
  const [adding, setAdding] = useState(false);
  const [trLabel, setTrLabel] = useState(false);
  const [trDesc, setTrDesc] = useState(false);
  const [basisBusy, setBasisBusy] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; msg: string } | null>(null);
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("ALL");

  async function translate(text: string, to: "el" | "en"): Promise<string> {
    const res = await fetch("/api/ai/consent-translate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, to }),
    });
    if (!res.ok) return "";
    return (await res.json()).translated ?? "";
  }

  async function suggestBasis(f: FieldRow) {
    setBasisBusy(f.id); setRowError(null);
    try {
      const res = await fetch("/api/ai/consent-legal-basis", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldKey: f.key, labelEl: loc(f.label, "el"), descriptionEl: loc(f.description, "el"), isSpecialCategory: f.isSpecialCategory }),
      });
      const json = await res.json();
      if (!res.ok) { setRowError({ id: f.id, msg: json.error ?? "Αποτυχία πρότασης" }); return; }
      const suggestions: Suggestion[] = json.suggestions ?? [];
      await updatePersonalDataField(f.id, { suggestedLegalBasis: suggestions });
      setFields((prev) => prev.map((x) => (x.id === f.id ? { ...x, suggestedLegalBasis: suggestions } : x)));
    } catch (e) {
      setRowError({ id: f.id, msg: (e as Error).message });
    } finally { setBasisBusy(null); }
  }

  async function add() {
    setAdding(true);
    try {
      const created = await createPersonalDataField({
        key: draft.key,
        label: { el: draft.labelEl, en: draft.labelEn },
        description: { el: draft.descEl, en: draft.descEn },
        category: draft.category as never,
        isSpecialCategory: draft.isSpecialCategory,
        inputType: draft.inputType as never,
      });
      setFields((prev) => [...prev, created as unknown as FieldRow]);
      setDraft({ key: "", labelEl: "", labelEn: "", descEl: "", descEn: "", category: "OTHER", inputType: "TEXT", isSpecialCategory: false });
    } finally { setAdding(false); }
  }

  async function remove(id: string) {
    if (!confirm("Διαγραφή πεδίου;")) return;
    await deletePersonalDataField(id);
    setFields((prev) => prev.filter((x) => x.id !== id));
  }

  const visible = fields.filter((f) => {
    if (catFilter !== "ALL" && f.category !== catFilter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return f.key.toLowerCase().includes(q) || loc(f.label, "el").toLowerCase().includes(q) || loc(f.label, "en").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Add new field */}
      <SectionCard icon={Plus} title="Νέο πεδίο" hint="Δημιουργήστε έναν τύπο προσωπικού δεδομένου με μετάφραση EL/EN και νομική τεκμηρίωση.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Κωδικός (key)</label>
            <Input placeholder="π.χ. email, afm, full_name" value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Κατηγορία</label>
              <select className="h-9 w-full rounded-md border border-neutral-200 bg-white px-2 text-sm" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Τύπος εισόδου</label>
              <select className="h-9 w-full rounded-md border border-neutral-200 bg-white px-2 text-sm" value={draft.inputType} onChange={(e) => setDraft({ ...draft, inputType: e.target.value })}>
                {INPUT_TYPES.map((t) => <option key={t} value={t}>{INPUT_LABELS[t]}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Ετικέτα (Ελληνικά)</label>
            <Input placeholder="π.χ. Διεύθυνση email" value={draft.labelEl} onChange={(e) => setDraft({ ...draft, labelEl: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 flex items-center justify-between text-xs font-medium text-neutral-600">
              <span>Label (English)</span>
              <button type="button" disabled={trLabel || !draft.labelEl} onClick={async () => { setTrLabel(true); try { const t = await translate(draft.labelEl, "en"); setDraft((d) => ({ ...d, labelEn: t })); } finally { setTrLabel(false); } }}
                className="inline-flex items-center gap-1 text-[#0078d4] disabled:opacity-40">
                {trLabel ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />} EL→EN
              </button>
            </label>
            <Input placeholder="e.g. Email address" value={draft.labelEn} onChange={(e) => setDraft({ ...draft, labelEn: e.target.value })} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Περιγραφή (Ελληνικά)</label>
            <Textarea rows={2} placeholder="Σύντομη περιγραφή του πεδίου" value={draft.descEl} onChange={(e) => setDraft({ ...draft, descEl: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 flex items-center justify-between text-xs font-medium text-neutral-600">
              <span>Description (English)</span>
              <button type="button" disabled={trDesc || !draft.descEl} onClick={async () => { setTrDesc(true); try { const t = await translate(draft.descEl, "en"); setDraft((d) => ({ ...d, descEn: t })); } finally { setTrDesc(false); } }}
                className="inline-flex items-center gap-1 text-[#0078d4] disabled:opacity-40">
                {trDesc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />} EL→EN
              </button>
            </label>
            <Textarea rows={2} placeholder="Short description" value={draft.descEn} onChange={(e) => setDraft({ ...draft, descEn: e.target.value })} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
            <input type="checkbox" checked={draft.isSpecialCategory} onChange={(e) => setDraft({ ...draft, isSpecialCategory: e.target.checked })} />
            <ShieldAlert className="h-4 w-4 text-red-500" /> Ειδική κατηγορία (Άρθρο 9)
          </label>
          <Button className="ml-auto" onClick={add} disabled={adding || !draft.key.trim() || !draft.labelEl.trim()}>
            {adding ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
            {adding ? "Προσθήκη…" : "Προσθήκη πεδίου"}
          </Button>
        </div>
      </SectionCard>

      {/* Explainer for legal basis */}
      <div className="flex items-start gap-2 rounded-md border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-neutral-600">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#0078d4]" />
        <p>
          <strong className="text-neutral-700">«Πρόταση βάσης» (AI):</strong> το DeepSeek προτείνει την κατάλληλη <strong>νομική βάση επεξεργασίας κατά το Άρθρο 6 GDPR</strong> (π.χ. Συγκατάθεση, Σύμβαση, Νομική υποχρέωση) για κάθε πεδίο, με σύντομη αιτιολόγηση. Η ανάλυση διαρκεί λίγα δευτερόλεπτα.
        </p>
      </div>

      {/* Fields list */}
      <SectionCard icon={Search} title={`Βιβλιοθήκη πεδίων (${fields.length})`} hint="Όλοι οι διαθέσιμοι τύποι προσωπικών δεδομένων.">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Αναζήτηση…" className="h-9 w-full rounded-md border border-neutral-200 pl-9 pr-3 text-sm outline-none focus:border-[#0078d4]" />
          </div>
          <select className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
            <option value="ALL">Όλες οι κατηγορίες</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
        </div>

        <div className="overflow-hidden rounded-md border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-2 font-medium">Πεδίο</th>
                <th className="px-3 py-2 font-medium">Κατηγορία</th>
                <th className="px-3 py-2 font-medium">Νομική βάση (Άρθ. 6)</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((f) => {
                const suggestions = asSuggestions(f.suggestedLegalBasis);
                return (
                  <tr key={f.id} className="border-t border-neutral-100 align-top hover:bg-neutral-50">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-neutral-800">{loc(f.label, "el")}</span>
                        {f.isSpecialCategory && (
                          <span className="inline-flex items-center gap-1 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                            <ShieldAlert className="h-3 w-3" /> Άρθ. 9
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-xs text-neutral-400">{f.key}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="secondary">{CATEGORY_LABELS[f.category] ?? f.category}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      {suggestions.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {suggestions.map((s, i) => (
                            <span key={i} title={s.rationale?.el ?? ""} className="cursor-help rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-[#0078d4]">
                              {BASIS_LABELS[s.basis] ?? s.basis}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-400">—</span>
                      )}
                      {rowError?.id === f.id && <p className="mt-1 text-xs text-red-600">{rowError.msg}</p>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="outline" disabled={basisBusy === f.id} onClick={() => suggestBasis(f)}>
                          {basisBusy === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                          <span className="ml-1 hidden sm:inline">{suggestions.length ? "Επανάληψη" : "Πρόταση βάσης"}</span>
                        </Button>
                        <button onClick={() => remove(f.id)} className="rounded p-1.5 text-neutral-400 hover:text-red-600" title="Διαγραφή">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr><td className="px-3 py-10 text-center text-sm text-neutral-400" colSpan={4}>
                  {fields.length === 0 ? "Δεν υπάρχουν πεδία ακόμη." : "Κανένα πεδίο δεν ταιριάζει με την αναζήτηση."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
