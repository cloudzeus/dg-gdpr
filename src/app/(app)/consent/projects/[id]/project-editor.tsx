"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus, Trash2, Copy, Check, Database, Target, Settings2,
  Globe, Mail, MessageSquare, ShieldAlert, Save, Link2,
  FileSearch, Loader2, AlertTriangle, CheckCircle2, ArrowUpRight,
} from "lucide-react";
import {
  updateConsentProject, setProjectFields, addPurpose, deletePurpose,
} from "@/actions/consent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { loc, type LocalizedText } from "@/lib/localized";

interface ProjectData {
  id: string; name: string; slug: string; description: LocalizedText;
  status: string; confirmationMethod: string;
  fields: { fieldId: string; required: boolean; field: { id: string; key: string; label: LocalizedText; isSpecialCategory?: boolean } }[];
  purposes: { id: string; label: LocalizedText; description: LocalizedText; legalBasis: string; required: boolean }[];
}
interface FieldOption { id: string; key: string; label: LocalizedText; isSpecialCategory?: boolean }
interface SelectedField { fieldId: string; required: boolean; key: string; label: LocalizedText; isSpecialCategory?: boolean }

interface DpiaResult {
  required: boolean;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  triggers: string[];
  reasoning: { el: string; en: string };
  risks: Array<{ risk: { el: string; en: string }; mitigation: { el: string; en: string } }>;
  dpiaId: string | null;
}

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Προσχέδιο", badge: "secondary" as const },
  { value: "ACTIVE", label: "Ενεργό", badge: "success" as const },
  { value: "ARCHIVED", label: "Αρχειοθετημένο", badge: "outline" as const },
];
const METHOD_OPTIONS = [
  { value: "EMAIL", label: "Email" },
  { value: "SMS", label: "SMS" },
  { value: "BOTH", label: "Email + SMS" },
];
const BASIS_OPTIONS = [
  { value: "CONSENT", label: "Συγκατάθεση (Άρθ. 6§1α)" },
  { value: "CONTRACT", label: "Εκτέλεση σύμβασης (Άρθ. 6§1β)" },
  { value: "LEGAL_OBLIGATION", label: "Νομική υποχρέωση (Άρθ. 6§1γ)" },
  { value: "VITAL_INTEREST", label: "Ζωτικό συμφέρον (Άρθ. 6§1δ)" },
  { value: "PUBLIC_TASK", label: "Δημόσιο συμφέρον (Άρθ. 6§1ε)" },
  { value: "LEGITIMATE_INTEREST", label: "Έννομο συμφέρον (Άρθ. 6§1στ)" },
];
const basisLabel = (v: string) => BASIS_OPTIONS.find((b) => b.value === v)?.label ?? v;

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

export function ProjectEditor({ project, allFields }: { project: ProjectData; allFields: FieldOption[] }) {
  const [name, setName] = useState(project.name);
  const [descEl, setDescEl] = useState(project.description?.el ?? "");
  const [descEn, setDescEn] = useState(project.description?.en ?? "");
  const [status, setStatus] = useState(project.status);
  const [method, setMethod] = useState(project.confirmationMethod);
  const [fields, setFields] = useState<SelectedField[]>(
    project.fields.map((f) => ({ fieldId: f.fieldId, required: f.required, key: f.field.key, label: f.field.label, isSpecialCategory: f.field.isSpecialCategory })),
  );
  const [purposes, setPurposes] = useState(project.purposes);
  const [purposeDraft, setPurposeDraft] = useState({ labelEl: "", labelEn: "", descEl: "", descEn: "", legalBasis: "CONSENT", required: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [addingPurpose, setAddingPurpose] = useState(false);
  const [dpiaLoading, setDpiaLoading] = useState(false);
  const [dpia, setDpia] = useState<DpiaResult | null>(null);
  const [dpiaError, setDpiaError] = useState("");

  const publicBase = typeof window !== "undefined" ? window.location.origin : "";
  const formUrl = `${publicBase}/c/${project.slug}`;
  const manageUrl = `${publicBase}/c/${project.slug}/manage`;
  const statusMeta = STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];
  const availableFields = allFields.filter((f) => !fields.some((sf) => sf.fieldId === f.id));

  async function saveDetails() {
    setSaving(true); setSaved(false);
    try {
      await updateConsentProject(project.id, {
        name, description: { el: descEl, en: descEn }, status: status as never, confirmationMethod: method as never,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  }

  async function persistFields(next: SelectedField[]) {
    setFields(next);
    await setProjectFields(project.id, next.map((f) => ({ fieldId: f.fieldId, required: f.required })));
  }
  async function addField(id: string) {
    const f = allFields.find((x) => x.id === id);
    if (!f) return;
    await persistFields([...fields, { fieldId: f.id, required: false, key: f.key, label: f.label, isSpecialCategory: f.isSpecialCategory }]);
  }
  async function removeField(id: string) { await persistFields(fields.filter((f) => f.fieldId !== id)); }
  async function toggleRequired(id: string) {
    await persistFields(fields.map((f) => (f.fieldId === id ? { ...f, required: !f.required } : f)));
  }

  async function addP() {
    if (!purposeDraft.labelEl.trim()) return;
    setAddingPurpose(true);
    try {
      const created = await addPurpose(project.id, {
        label: { el: purposeDraft.labelEl, en: purposeDraft.labelEn },
        description: { el: purposeDraft.descEl, en: purposeDraft.descEn },
        legalBasis: purposeDraft.legalBasis as never, required: purposeDraft.required,
      });
      setPurposes((p) => [...p, created as never]);
      setPurposeDraft({ labelEl: "", labelEn: "", descEl: "", descEn: "", legalBasis: "CONSENT", required: false });
    } finally { setAddingPurpose(false); }
  }
  async function removeP(id: string) {
    await deletePurpose(id);
    setPurposes((p) => p.filter((x) => x.id !== id));
  }

  async function copy(text: string, key: string) {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1800); } catch { /* noop */ }
  }

  async function runDpiaCheck() {
    setDpiaLoading(true); setDpiaError(""); setDpia(null);
    try {
      const res = await fetch("/api/ai/consent-dpia-check", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const json = await res.json();
      if (!res.ok) { setDpiaError(json.error ?? "Σφάλμα ελέγχου DPIA"); return; }
      setDpia(json);
    } catch (e) { setDpiaError((e as Error).message); }
    finally { setDpiaLoading(false); }
  }

  const riskTone: Record<string, string> = {
    LOW: "text-green-600 bg-green-50",
    MEDIUM: "text-amber-600 bg-amber-50",
    HIGH: "text-red-600 bg-red-50",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-neutral-900">{project.name}</h1>
        <Badge variant={statusMeta.badge}>{statusMeta.label}</Badge>
        <code className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">/{project.slug}</code>
      </div>

      {/* Στοιχεία */}
      <SectionCard icon={Settings2} title="Στοιχεία project" hint="Όνομα και περιγραφή που βλέπει το υποκείμενο στη δημόσια φόρμα.">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Όνομα</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="π.χ. Newsletter & Επικοινωνία" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Περιγραφή (Ελληνικά)</label>
              <Textarea rows={3} value={descEl} onChange={(e) => setDescEl(e.target.value)} placeholder="Τι αφορά αυτή η συλλογή συναινέσεων;" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Description (English)</label>
              <Textarea rows={3} value={descEn} onChange={(e) => setDescEn(e.target.value)} placeholder="What is this consent collection about?" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Κατάσταση</label>
              <select className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              {status !== "ACTIVE" && <p className="mt-1 text-xs text-amber-600">Η δημόσια φόρμα δέχεται συναινέσεις μόνο όταν είναι «Ενεργό».</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Τρόπος επιβεβαίωσης (double opt-in)</label>
              <select className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
                {METHOD_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Button onClick={saveDetails} disabled={saving}>
              <Save className="mr-1.5 h-4 w-4" />
              {saving ? "Αποθήκευση…" : "Αποθήκευση στοιχείων"}
            </Button>
            {saved && <span className="inline-flex items-center gap-1 text-sm text-green-600"><Check className="h-4 w-4" /> Αποθηκεύτηκε</span>}
          </div>
        </div>
      </SectionCard>

      {/* Δημόσια URLs */}
      <SectionCard icon={Link2} title="Δημόσιοι σύνδεσμοι" hint="Μοιραστείτε τους με τα υποκείμενα των δεδομένων.">
        <div className="space-y-2">
          {[
            { key: "form", label: "Φόρμα συναίνεσης", url: formUrl },
            { key: "manage", label: "Κέντρο προτιμήσεων (διαγραφή/λήψη)", url: manageUrl },
          ].map((row) => (
            <div key={row.key} className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-neutral-500">{row.label}</p>
                <p className="truncate font-mono text-sm text-neutral-700">{row.url}</p>
              </div>
              <a href={row.url} target="_blank" rel="noreferrer" className="rounded p-1.5 text-neutral-400 hover:text-[#0078d4]" title="Άνοιγμα"><Globe className="h-4 w-4" /></a>
              <Button variant="outline" size="sm" onClick={() => copy(row.url, row.key)}>
                {copied === row.key ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Πεδία (ένα-ένα) */}
      <SectionCard icon={Database} title="Πεδία που συλλέγονται" hint="Προσθέστε ένα-ένα τα προσωπικά δεδομένα που θα ζητά η φόρμα.">
        {availableFields.length > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <select
              className="h-9 flex-1 rounded-md border border-neutral-200 bg-white px-3 text-sm"
              value=""
              onChange={(e) => { if (e.target.value) addField(e.target.value); }}
            >
              <option value="">+ Προσθήκη πεδίου…</option>
              {availableFields.map((f) => (
                <option key={f.id} value={f.id}>{loc(f.label, "el")} ({f.key}){f.isSpecialCategory ? " — ειδική κατηγορία" : ""}</option>
              ))}
            </select>
            <Plus className="h-4 w-4 text-neutral-400" />
          </div>
        )}

        {fields.length === 0 ? (
          <p className="rounded-md border border-dashed border-neutral-200 py-6 text-center text-sm text-neutral-400">
            Δεν έχει προστεθεί κανένα πεδίο. Επιλέξτε από την παραπάνω λίστα.
          </p>
        ) : (
          <ul className="space-y-2">
            {fields.map((f) => (
              <li key={f.fieldId} className="flex items-center gap-3 rounded-md border border-neutral-200 px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-neutral-800">{loc(f.label, "el")}</span>
                  <span className="ml-2 font-mono text-xs text-neutral-400">{f.key}</span>
                  {f.isSpecialCategory && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                      <ShieldAlert className="h-3 w-3" /> Ειδική κατηγορία
                    </span>
                  )}
                </span>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-neutral-600">
                  <input type="checkbox" checked={f.required} onChange={() => toggleRequired(f.fieldId)} />
                  Υποχρεωτικό
                </label>
                <button onClick={() => removeField(f.fieldId)} className="text-neutral-400 hover:text-red-600" title="Αφαίρεση">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {allFields.length === 0 && (
          <p className="mt-2 text-xs text-neutral-400">Δεν υπάρχουν πεδία στη βιβλιοθήκη — δημιουργήστε πρώτα στα «Πεδία Δεδομένων».</p>
        )}
      </SectionCard>

      {/* Σκοποί */}
      <SectionCard
        icon={Target}
        title="Τι θα κάνετε με τα δεδομένα;"
        hint="Καταχωρίστε κάθε σκοπό επεξεργασίας ξεχωριστά — το υποκείμενο συναινεί ανά σκοπό (granular consent)."
      >
        {purposes.length > 0 && (
          <ul className="mb-5 space-y-2">
            {purposes.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3 rounded-md border border-neutral-200 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-neutral-800">{loc(p.label, "el")}</span>
                    {p.required && <Badge variant="warning">Υποχρεωτικός</Badge>}
                    <Badge variant="outline">{basisLabel(p.legalBasis)}</Badge>
                  </div>
                  {loc(p.description, "el") && <p className="mt-0.5 text-xs text-neutral-500">{loc(p.description, "el")}</p>}
                </div>
                <button onClick={() => removeP(p.id)} className="mt-0.5 shrink-0 text-neutral-400 hover:text-red-600" title="Διαγραφή σκοπού">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50/60 p-4">
          <p className="mb-3 text-xs font-medium text-neutral-600">Νέος σκοπός χρήσης</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Σκοπός (Ελληνικά) — π.χ. Αποστολή newsletter" value={purposeDraft.labelEl} onChange={(e) => setPurposeDraft({ ...purposeDraft, labelEl: e.target.value })} />
            <Input placeholder="Purpose (English) — optional" value={purposeDraft.labelEn} onChange={(e) => setPurposeDraft({ ...purposeDraft, labelEn: e.target.value })} />
            <Textarea rows={2} placeholder="Σύντομη περιγραφή (Ελληνικά)" value={purposeDraft.descEl} onChange={(e) => setPurposeDraft({ ...purposeDraft, descEl: e.target.value })} />
            <Textarea rows={2} placeholder="Short description (English) — optional" value={purposeDraft.descEn} onChange={(e) => setPurposeDraft({ ...purposeDraft, descEn: e.target.value })} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm" value={purposeDraft.legalBasis} onChange={(e) => setPurposeDraft({ ...purposeDraft, legalBasis: e.target.value })}>
              {BASIS_OPTIONS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
            <label className="flex cursor-pointer items-center gap-1.5 text-sm text-neutral-600">
              <input type="checkbox" checked={purposeDraft.required} onChange={(e) => setPurposeDraft({ ...purposeDraft, required: e.target.checked })} />
              Υποχρεωτικός σκοπός
            </label>
            <Button className="ml-auto" onClick={addP} disabled={addingPurpose || !purposeDraft.labelEl.trim()}>
              <Plus className="mr-1.5 h-4 w-4" />
              {addingPurpose ? "Προσθήκη…" : "Προσθήκη σκοπού"}
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* DPIA check */}
      <SectionCard icon={FileSearch} title="Έλεγχος ανάγκης DPIA (AI)" hint="Με βάση την περιγραφή, τους σκοπούς και τα πεδία, το DeepSeek αξιολογεί αν απαιτείται Εκτίμηση Αντικτύπου (Άρθρο 35).">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={runDpiaCheck} disabled={dpiaLoading}>
            {dpiaLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileSearch className="mr-1.5 h-4 w-4" />}
            {dpiaLoading ? "Ανάλυση…" : "Έλεγχος ανάγκης DPIA"}
          </Button>
          <span className="text-xs text-neutral-400">Αποθηκεύστε πρώτα τα στοιχεία και τους σκοπούς για ακριβέστερη ανάλυση.</span>
        </div>

        {dpiaError && <p className="mt-3 text-sm text-red-600">{dpiaError}</p>}

        {dpia && (
          <div className="mt-4 rounded-md border border-neutral-200 p-4">
            <div className="flex flex-wrap items-center gap-3">
              {dpia.required ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-red-600"><AlertTriangle className="h-4 w-4" /> Απαιτείται DPIA</span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-medium text-green-600"><CheckCircle2 className="h-4 w-4" /> Δεν απαιτείται DPIA</span>
              )}
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${riskTone[dpia.riskLevel] ?? ""}`}>Κίνδυνος: {dpia.riskLevel}</span>
              {dpia.dpiaId && (
                <Link href={`/dpia/${dpia.dpiaId}`} className="ml-auto inline-flex items-center gap-1 text-sm text-[#0078d4] hover:underline">
                  Άνοιγμα DPIA <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>

            {dpia.reasoning?.el && <p className="mt-3 text-sm text-neutral-700">{dpia.reasoning.el}</p>}

            {dpia.triggers?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {dpia.triggers.map((t, i) => <Badge key={i} variant="secondary">{t}</Badge>)}
              </div>
            )}

            {dpia.risks?.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-neutral-600">Κίνδυνοι & μέτρα μετριασμού</p>
                {dpia.risks.map((r, i) => (
                  <div key={i} className="rounded-md bg-neutral-50 p-3 text-sm">
                    <p className="text-neutral-800"><strong className="text-red-600">Κίνδυνος:</strong> {r.risk?.el}</p>
                    <p className="mt-1 text-neutral-600"><strong className="text-green-600">Μέτρο:</strong> {r.mitigation?.el}</p>
                  </div>
                ))}
              </div>
            )}

            {dpia.required && dpia.dpiaId && (
              <p className="mt-3 text-xs text-green-600">✓ Δημιουργήθηκε/ενημερώθηκε εγγραφή DPIA και αποθηκεύτηκε στα DPIA του οργανισμού.</p>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
