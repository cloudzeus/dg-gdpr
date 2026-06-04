"use client";

import { useState } from "react";
import {
  updateConsentProject, setProjectFields, addPurpose, deletePurpose,
} from "@/actions/consent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { loc, type LocalizedText } from "@/lib/localized";

interface ProjectData {
  id: string; name: string; slug: string; description: LocalizedText;
  status: string; confirmationMethod: string;
  fields: { fieldId: string; field: { id: string; key: string; label: LocalizedText } }[];
  purposes: { id: string; label: LocalizedText; description: LocalizedText; legalBasis: string; required: boolean }[];
}
interface FieldOption { id: string; key: string; label: LocalizedText }

const STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"];
const METHODS = ["EMAIL", "SMS", "BOTH"];
const BASES = ["CONSENT", "CONTRACT", "LEGAL_OBLIGATION", "VITAL_INTEREST", "PUBLIC_TASK", "LEGITIMATE_INTEREST"];

export function ProjectEditor({ project, allFields }: { project: ProjectData; allFields: FieldOption[] }) {
  const [name, setName] = useState(project.name);
  const [descEl, setDescEl] = useState(project.description?.el ?? "");
  const [descEn, setDescEn] = useState(project.description?.en ?? "");
  const [status, setStatus] = useState(project.status);
  const [method, setMethod] = useState(project.confirmationMethod);
  const [selected, setSelected] = useState<string[]>(project.fields.map((f) => f.fieldId));
  const [purposes, setPurposes] = useState(project.purposes);
  const [purposeDraft, setPurposeDraft] = useState({ labelEl: "", labelEn: "", descEl: "", descEn: "", legalBasis: "CONSENT", required: false });

  const publicBase = typeof window !== "undefined" ? window.location.origin : "";

  async function saveDetails() {
    await updateConsentProject(project.id, {
      name, description: { el: descEl, en: descEn }, status: status as never, confirmationMethod: method as never,
    });
    alert("Αποθηκεύτηκε");
  }
  async function toggleField(id: string) {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    setSelected(next);
    await setProjectFields(project.id, next);
  }
  async function addP() {
    const created = await addPurpose(project.id, {
      label: { el: purposeDraft.labelEl, en: purposeDraft.labelEn },
      description: { el: purposeDraft.descEl, en: purposeDraft.descEn },
      legalBasis: purposeDraft.legalBasis as never, required: purposeDraft.required,
    });
    setPurposes((p) => [...p, created as never]);
    setPurposeDraft({ labelEl: "", labelEn: "", descEl: "", descEn: "", legalBasis: "CONSENT", required: false });
  }
  async function removeP(id: string) {
    await deletePurpose(id);
    setPurposes((p) => p.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <section className="border rounded-lg p-4 bg-white space-y-3">
        <h2 className="font-medium">Στοιχεία</h2>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Όνομα" />
        <div className="grid grid-cols-2 gap-3">
          <Textarea value={descEl} onChange={(e) => setDescEl(e.target.value)} placeholder="Περιγραφή (EL)" />
          <Textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} placeholder="Description (EN)" />
        </div>
        <div className="flex gap-3">
          <select className="border rounded px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
          <select className="border rounded px-2 text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select>
          <Button onClick={saveDetails}>Αποθήκευση</Button>
        </div>
        <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
          <p>Δημόσια φόρμα: <code>{publicBase}/c/{project.slug}</code></p>
          <p>Κέντρο προτιμήσεων: <code>{publicBase}/c/{project.slug}/manage</code></p>
        </div>
      </section>

      <section className="border rounded-lg p-4 bg-white">
        <h2 className="font-medium mb-3">Πεδία δεδομένων</h2>
        <div className="grid grid-cols-2 gap-2">
          {allFields.map((f) => (
            <label key={f.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selected.includes(f.id)} onChange={() => toggleField(f.id)} />
              {loc(f.label, "el")} <span className="text-gray-400 font-mono text-xs">{f.key}</span>
            </label>
          ))}
          {allFields.length === 0 && <p className="text-gray-400 text-sm">Δημιουργήστε πρώτα πεδία στη βιβλιοθήκη.</p>}
        </div>
      </section>

      <section className="border rounded-lg p-4 bg-white space-y-3">
        <h2 className="font-medium">Λόγοι / Σκοποί χρήσης</h2>
        {purposes.map((p) => (
          <div key={p.id} className="flex items-center justify-between border-t pt-2 text-sm">
            <div><strong>{loc(p.label, "el")}</strong> <span className="text-gray-400">({p.legalBasis}{p.required ? ", υποχρεωτικός" : ""})</span></div>
            <Button size="sm" variant="outline" onClick={() => removeP(p.id)}>Διαγραφή</Button>
          </div>
        ))}
        <div className="border-t pt-3 grid grid-cols-2 gap-2">
          <Input placeholder="Σκοπός (EL)" value={purposeDraft.labelEl} onChange={(e) => setPurposeDraft({ ...purposeDraft, labelEl: e.target.value })} />
          <Input placeholder="Purpose (EN)" value={purposeDraft.labelEn} onChange={(e) => setPurposeDraft({ ...purposeDraft, labelEn: e.target.value })} />
          <Textarea placeholder="Περιγραφή (EL)" value={purposeDraft.descEl} onChange={(e) => setPurposeDraft({ ...purposeDraft, descEl: e.target.value })} />
          <Textarea placeholder="Description (EN)" value={purposeDraft.descEn} onChange={(e) => setPurposeDraft({ ...purposeDraft, descEn: e.target.value })} />
          <select className="border rounded px-2 text-sm" value={purposeDraft.legalBasis} onChange={(e) => setPurposeDraft({ ...purposeDraft, legalBasis: e.target.value })}>{BASES.map((b) => <option key={b}>{b}</option>)}</select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={purposeDraft.required} onChange={(e) => setPurposeDraft({ ...purposeDraft, required: e.target.checked })} /> Υποχρεωτικός</label>
          <Button onClick={addP} disabled={!purposeDraft.labelEl}>Προσθήκη σκοπού</Button>
        </div>
      </section>
    </div>
  );
}
