"use client";

import { useState } from "react";
import {
  createPersonalDataField,
  updatePersonalDataField,
  deletePersonalDataField,
} from "@/actions/consent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { loc, type LocalizedText } from "@/lib/localized";

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
const INPUT_TYPES = ["TEXT", "EMAIL", "PHONE", "DATE", "NUMBER", "TEXTAREA"];

export function FieldsManager({ initialFields }: { initialFields: FieldRow[] }) {
  const [fields, setFields] = useState<FieldRow[]>(initialFields);
  const [draft, setDraft] = useState({
    key: "", labelEl: "", labelEn: "", descEl: "", descEn: "",
    category: "OTHER", inputType: "TEXT", isSpecialCategory: false,
  });
  const [busy, setBusy] = useState(false);

  async function translate(text: string, to: "el" | "en"): Promise<string> {
    const res = await fetch("/api/ai/consent-translate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, to }),
    });
    if (!res.ok) return "";
    return (await res.json()).translated ?? "";
  }

  async function suggestBasis(id: string, f: FieldRow) {
    const res = await fetch("/api/ai/consent-legal-basis", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fieldKey: f.key, labelEl: loc(f.label, "el"), descriptionEl: loc(f.description, "el"), isSpecialCategory: f.isSpecialCategory }),
    });
    if (!res.ok) { alert("Αποτυχία πρότασης νομικής βάσης"); return; }
    const { suggestions } = await res.json();
    await updatePersonalDataField(id, { suggestedLegalBasis: suggestions });
    setFields((prev) => prev.map((x) => (x.id === id ? { ...x, suggestedLegalBasis: suggestions } : x)));
  }

  async function add() {
    setBusy(true);
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
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm("Διαγραφή πεδίου;")) return;
    await deletePersonalDataField(id);
    setFields((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-4 space-y-3 bg-white">
        <h2 className="font-medium">Νέο πεδίο</h2>
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="key (π.χ. email)" value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })} />
          <div className="flex gap-2">
            <select className="border rounded px-2 text-sm" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="border rounded px-2 text-sm" value={draft.inputType} onChange={(e) => setDraft({ ...draft, inputType: e.target.value })}>
              {INPUT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <Input placeholder="Ετικέτα (EL)" value={draft.labelEl} onChange={(e) => setDraft({ ...draft, labelEl: e.target.value })} />
          <div className="flex gap-2">
            <Input placeholder="Label (EN)" value={draft.labelEn} onChange={(e) => setDraft({ ...draft, labelEn: e.target.value })} />
            <Button type="button" variant="outline" disabled={busy || !draft.labelEl} onClick={async () => {
              setBusy(true);
              try { const t = await translate(draft.labelEl, "en"); setDraft((d) => ({ ...d, labelEn: t })); }
              finally { setBusy(false); }
            }}>EL→EN</Button>
          </div>
          <Textarea placeholder="Περιγραφή (EL)" value={draft.descEl} onChange={(e) => setDraft({ ...draft, descEl: e.target.value })} />
          <div className="space-y-2">
            <Textarea placeholder="Description (EN)" value={draft.descEn} onChange={(e) => setDraft({ ...draft, descEn: e.target.value })} />
            <Button type="button" variant="outline" size="sm" disabled={busy || !draft.descEl} onClick={async () => {
              setBusy(true);
              try { const t = await translate(draft.descEl, "en"); setDraft((d) => ({ ...d, descEn: t })); }
              finally { setBusy(false); }
            }}>Μετάφραση EL→EN</Button>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.isSpecialCategory} onChange={(e) => setDraft({ ...draft, isSpecialCategory: e.target.checked })} />
          Ειδική κατηγορία (Άρθρο 9)
        </label>
        <Button onClick={add} disabled={busy || !draft.key || !draft.labelEl}>Προσθήκη πεδίου</Button>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr><th className="p-2">Key</th><th className="p-2">Ετικέτα</th><th className="p-2">Κατηγορία</th><th className="p-2">Άρθ.9</th><th className="p-2">Νομική βάση</th><th className="p-2"></th></tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.id} className="border-t">
                <td className="p-2 font-mono">{f.key}</td>
                <td className="p-2">{loc(f.label, "el")}</td>
                <td className="p-2">{f.category}</td>
                <td className="p-2">{f.isSpecialCategory ? "✔" : "—"}</td>
                <td className="p-2">{Array.isArray(f.suggestedLegalBasis) && f.suggestedLegalBasis.length ? (f.suggestedLegalBasis as Array<{ basis: string }>).map((s) => s.basis).join(", ") : "—"}</td>
                <td className="p-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => suggestBasis(f.id, f)}>Πρόταση βάσης</Button>
                  <Button size="sm" variant="outline" onClick={() => remove(f.id)}>Διαγραφή</Button>
                </td>
              </tr>
            ))}
            {fields.length === 0 && <tr><td className="p-4 text-gray-400" colSpan={6}>Δεν υπάρχουν πεδία ακόμη.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
