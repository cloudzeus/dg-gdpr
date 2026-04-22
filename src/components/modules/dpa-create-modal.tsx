"use client";

import { useState, useTransition } from "react";
import { createDpaContract } from "@/actions/dpia";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { FiInfo, FiX, FiChevronRight, FiChevronLeft, FiDownload, FiZap } from "react-icons/fi";
import { Loader2, ExternalLink } from "lucide-react";
import { MdSearch } from "react-icons/md";

interface Project {
  id: string;
  name: string;
  description?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  projects: Project[];
}

interface PartyInfo {
  name: string;
  vat: string;
  address: string;
  rep: string;
  email: string;
}

const emptyParty = (): PartyInfo => ({ name: "", vat: "", address: "", rep: "", email: "" });

type Step = 1 | 2 | 3;

const STEP_HELP: Record<Step, { title: string; text: string; article: string }> = {
  1: {
    title: "Μέρη Σύμβασης DPA",
    text: "Η Σύμβαση Επεξεργασίας Δεδομένων (DPA) απαιτεί σαφή ταυτοποίηση Υπεύθυνου και Εκτελούντος. Χρησιμοποιήστε το ΑΦΜ για αυτόματη συμπλήρωση από τη ΓΓΔΕ.",
    article: "Άρθρο 28 GDPR — Απαιτείται γραπτή σύμβαση με κάθε τρίτο εκτελούντα.",
  },
  2: {
    title: "Δεδομένα & Σκοποί",
    text: "Καθορίστε ποιες κατηγορίες δεδομένων επεξεργάζεται ο Εκτελών και για ποιους σκοπούς. Χρησιμοποιήστε το AI για έξυπνες προτάσεις βάσει του έργου.",
    article: "Άρθρο 28 §3 — Ο Εκτελών επεξεργάζεται μόνο κατόπιν τεκμηριωμένων εντολών.",
  },
  3: {
    title: "Ασφάλεια & Επιβεβαίωση",
    text: "Τεκμηριώστε τα τεχνικά και οργανωτικά μέτρα ασφαλείας. Αν χρησιμοποιούνται υποεκτελούντες απαιτείται έγγραφη άδεια.",
    article: "Άρθρα 28 §2, 32 GDPR — Κρυπτογράφηση, εμπιστευτικότητα, δοκιμές ασφαλείας.",
  },
};

export function DpaCreateModal({ open, onClose, projects }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [showHelp, setShowHelp] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; pdfUrl: string | null } | null>(null);

  // Step 1 — parties
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [controller, setController] = useState<PartyInfo>(emptyParty());
  const [processor, setProcessor] = useState<PartyInfo>(emptyParty());

  // Step 2 — data
  const [dataCategories, setDataCategories] = useState("Στοιχεία επικοινωνίας, ΑΦΜ, Email, Τηλέφωνο, Ονοματεπώνυμο");
  const [purposes, setPurposes] = useState("Ανάπτυξη λογισμικού\nΥποστήριξη ERP\nΔιαχείριση δεδομένων πελατών");
  const [retentionPeriod, setRetentionPeriod] = useState("5 χρόνια από λήξη σύμβασης");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Step 3 — security
  const [safeguards, setSafeguards] = useState("");
  const [subProcessors, setSubProcessors] = useState("");
  const [notes, setNotes] = useState("");

  const selectedProject = projects.find((p) => p.id === projectId);

  async function generateWithAI() {
    setAiLoading(true); setAiError(null);
    try {
      const res = await fetch("/api/ai/dpa-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: selectedProject?.name ?? "",
          projectDescription: selectedProject?.description ?? "",
          controllerName: controller.name,
          processorName: processor.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setAiError(data.error ?? "Σφάλμα AI"); return; }
      if (data.dataCategories?.length) setDataCategories(data.dataCategories.join(", "));
      if (data.purposes?.length) setPurposes(data.purposes.join("\n"));
      if (data.safeguards) setSafeguards(data.safeguards);
      if (data.subProcessors?.length) setSubProcessors(data.subProcessors.join(", "));
      if (data.retentionPeriod) setRetentionPeriod(data.retentionPeriod);
    } catch (e: any) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  }

  const handleSubmit = () => {
    const fd = new FormData();
    fd.append("projectId", projectId);
    fd.append("title", title);
    fd.append("controllerName", controller.name);
    fd.append("controllerVat", controller.vat);
    fd.append("controllerAddress", controller.address);
    fd.append("controllerRep", controller.rep);
    fd.append("controllerEmail", controller.email);
    fd.append("processorName", processor.name);
    fd.append("processorVat", processor.vat);
    fd.append("processorAddress", processor.address);
    fd.append("processorRep", processor.rep);
    fd.append("processorEmail", processor.email);
    fd.append("dataCategories", dataCategories);
    fd.append("purposes", purposes);
    fd.append("retentionPeriod", retentionPeriod);
    fd.append("safeguards", safeguards);
    fd.append("subProcessors", subProcessors);
    fd.append("notes", notes);

    setError(null);
    startTransition(async () => {
      try {
        const res = await createDpaContract(fd);
        setResult(res);
      } catch (e: any) {
        setError(e.message);
      }
    });
  };

  const stepTitles = ["Μέρη", "Δεδομένα & Σκοποί", "Ασφάλεια"];

  // Success state
  if (result) {
    return (
      <Modal open={open} onClose={onClose} title="Σύμβαση DPA Δημιουργήθηκε" size="sm">
        <div className="text-center space-y-4 py-4">
          <div className="text-5xl">✅</div>
          <p className="font-semibold">Η σύμβαση δημιουργήθηκε και αποθηκεύτηκε!</p>
          {result.pdfUrl ? (
            <a href={result.pdfUrl} target="_blank" rel="noreferrer" download>
              <Button className="gap-2 w-full">
                <FiDownload className="h-4 w-4" /> Λήψη Word (.docx)
              </Button>
            </a>
          ) : (
            <a href={`/api/export/dpa?id=${result.id}`} download>
              <Button className="gap-2 w-full">
                <FiDownload className="h-4 w-4" /> Λήψη Word (.docx)
              </Button>
            </a>
          )}
          <a href={`/dpa/${result.id}`}>
            <Button variant="outline" className="gap-2 w-full mt-1">
              <ExternalLink className="h-4 w-4" /> Προβολή & Τροποποίηση
            </Button>
          </a>
          <Button variant="ghost" onClick={onClose} className="w-full">Κλείσιμο</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Νέα Σύμβαση DPA (Άρθρο 28)"
      description="Δημιουργία σύμβασης επεξεργασίας δεδομένων — αυτόματη εξαγωγή Word"
      size="lg"
    >
      {/* Help panel */}
      {showHelp && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 relative">
          <button onClick={() => setShowHelp(false)} className="absolute right-3 top-3 text-blue-400 hover:text-blue-700">
            <FiX className="h-4 w-4" />
          </button>
          <p className="font-semibold text-sm text-blue-800 mb-1">{STEP_HELP[step].title}</p>
          <p className="text-sm text-blue-700 mb-2">{STEP_HELP[step].text}</p>
          <p className="text-xs text-blue-600 bg-blue-100 rounded px-2 py-1">{STEP_HELP[step].article}</p>
        </div>
      )}

      {/* Step indicator */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2 gap-2">
          {stepTitles.map((t, i) => (
            <div key={t} className="flex items-center gap-1.5">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                i + 1 < step ? "bg-green-500 text-white" :
                i + 1 === step ? "bg-primary text-white" :
                "bg-secondary text-muted-foreground"
              }`}>{i + 1 < step ? "✓" : i + 1}</span>
              <span className={`text-xs ${i + 1 === step ? "font-semibold" : "text-muted-foreground"}`}>{t}</span>
              {i < 2 && <FiChevronRight className="h-3.5 w-3.5 text-muted-foreground mx-1" />}
            </div>
          ))}
          <button type="button" onClick={() => setShowHelp((v) => !v)} className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline">
            <FiInfo className="h-3.5 w-3.5" /> Βοήθεια
          </button>
        </div>
        <Progress value={(step / 3) * 100} />
      </div>

      {/* ── Step 1: Parties ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Τίτλος Σύμβασης *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="π.χ. DPA — SoftOne ERP Integration" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Σχετικό Έργο</label>
            <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PartyForm
              label="Υπεύθυνος Επεξεργασίας (Controller)"
              value={controller}
              onChange={setController}
              placeholder="Ονομασία πελάτη"
            />
            <PartyForm
              label="Εκτελών Επεξεργασία (Processor)"
              value={processor}
              onChange={setProcessor}
              placeholder="Ονομασία εταιρείας σας"
            />
          </div>
        </div>
      )}

      {/* ── Step 2: Data & Purposes ── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Περιεχόμενο Σύμβασης</p>
            <button
              type="button"
              onClick={generateWithAI}
              disabled={aiLoading}
              className="flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium disabled:opacity-40"
              style={{ background: "rgba(0,120,212,0.1)", color: "#0078d4", border: "1px solid rgba(0,120,212,0.25)" }}
            >
              {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FiZap className="h-3 w-3" />}
              {aiLoading ? "Ανάλυση AI..." : "Πρόταση AI"}
            </button>
          </div>
          {aiError && <p className="text-xs text-destructive">{aiError}</p>}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Κατηγορίες Δεδομένων *</label>
            <p className="text-xs text-muted-foreground">Χωρίστε με κόμμα</p>
            <Textarea value={dataCategories} onChange={(e) => setDataCategories(e.target.value)} rows={2} placeholder="Στοιχεία επικοινωνίας, ΑΦΜ, Email..." />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Σκοποί Επεξεργασίας *</label>
            <p className="text-xs text-muted-foreground">Ένας σκοπός ανά γραμμή</p>
            <Textarea value={purposes} onChange={(e) => setPurposes(e.target.value)} rows={4} placeholder="Ανάπτυξη λογισμικού&#10;Υποστήριξη ERP" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Χρόνος Διατήρησης</label>
            <Input value={retentionPeriod} onChange={(e) => setRetentionPeriod(e.target.value)} placeholder="π.χ. 5 χρόνια από λήξη σύμβασης" />
          </div>
        </div>
      )}

      {/* ── Step 3: Security ── */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Τεχνικά & Οργανωτικά Μέτρα Ασφαλείας</label>
            <Textarea value={safeguards} onChange={(e) => setSafeguards(e.target.value)} rows={3} placeholder="Κρυπτογράφηση AES-256, έλεγχος πρόσβασης RBAC, τακτικά backups, VPN, MFA..." />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Υποεκτελούντες (χωρίστε με κόμμα)</label>
            <Input value={subProcessors} onChange={(e) => setSubProcessors(e.target.value)} placeholder="π.χ. Microsoft Azure, Google Workspace" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Εσωτερικές Σημειώσεις</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Σημειώσεις για εσωτερική χρήση — δεν εμφανίζονται στο Word..." />
          </div>

          {/* Summary */}
          <div className="rounded-lg bg-secondary/50 p-3 text-sm space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Σύνοψη</p>
            <p><span className="text-muted-foreground">Τίτλος:</span> {title}</p>
            <p><span className="text-muted-foreground">Controller:</span> {controller.name} {controller.vat && `(ΑΦΜ: ${controller.vat})`}</p>
            <p><span className="text-muted-foreground">Processor:</span> {processor.name} {processor.vat && `(ΑΦΜ: ${processor.vat})`}</p>
            <p><span className="text-muted-foreground">Διατήρηση:</span> {retentionPeriod}</p>
            <p className="text-xs text-muted-foreground mt-1">Το Word θα δημιουργηθεί και θα αποθηκευτεί αυτόματα.</p>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive mt-3">{error}</p>}

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
        <Button type="button" variant="ghost" onClick={step === 1 ? onClose : () => { setStep((s) => (s - 1) as Step); setShowHelp(false); }} className="gap-1.5">
          <FiChevronLeft className="h-3.5 w-3.5" />
          {step === 1 ? "Ακύρωση" : "Πίσω"}
        </Button>
        {step < 3 ? (
          <Button type="button" onClick={() => { setStep((s) => (s + 1) as Step); setShowHelp(false); }}
            disabled={step === 1 && (!title || !controller.name || !processor.name)}
            className="gap-1.5">
            Επόμενο <FiChevronRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isPending} className="gap-1.5">
            {isPending ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Δημιουργία Word...</>
            ) : "Δημιουργία DPA"}
          </Button>
        )}
      </div>
    </Modal>
  );
}

// ── Party Form ────────────────────────────────────────────────────────────────

function PartyForm({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: PartyInfo;
  onChange: (v: PartyInfo) => void;
  placeholder?: string;
}) {
  const [afm, setAfm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function lookup() {
    if (!/^\d{9}$/.test(afm)) { setErr("9 ψηφία"); return; }
    setLoading(true); setErr(null);
    try {
      const res = await fetch("/api/admin/vat-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ afm }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "Σφάλμα"); return; }
      const addr = [data.addressLine1, data.postalCode, data.city, data.country].filter(Boolean).join(", ");
      onChange({
        ...value,
        name: data.name || data.legalName || value.name,
        vat: afm,
        address: addr || value.address,
      });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>

      {/* VAT lookup row */}
      <div className="flex gap-1.5 items-center">
        <input
          value={afm}
          onChange={(e) => setAfm(e.target.value.replace(/\D/g, "").slice(0, 9))}
          placeholder="ΑΦΜ"
          maxLength={9}
          className="w-24 rounded-md border border-border bg-background px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/40"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); lookup(); } }}
        />
        <button
          type="button"
          onClick={lookup}
          disabled={loading || afm.length !== 9}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs disabled:opacity-40"
          style={{ background: "rgba(0,120,212,0.1)", color: "#0078d4", border: "1px solid rgba(0,120,212,0.25)" }}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <MdSearch size={13} />}
          ΓΓΔΕ
        </button>
        {err && <p className="text-[11px] text-destructive">{err}</p>}
      </div>

      <input
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        placeholder={placeholder ?? "Επωνυμία *"}
        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      <input
        value={value.address}
        onChange={(e) => onChange({ ...value, address: e.target.value })}
        placeholder="Διεύθυνση"
        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
      />
      <div className="grid grid-cols-2 gap-1.5">
        <input
          value={value.rep}
          onChange={(e) => onChange({ ...value, rep: e.target.value })}
          placeholder="Εκπρόσωπος"
          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
        <input
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
          placeholder="Email"
          type="email"
          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
      </div>
    </div>
  );
}
