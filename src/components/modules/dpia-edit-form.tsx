"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { updateDpia } from "@/actions/dpia";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

interface Props {
  id: string;
  title: string;
  status: string;
  processingPurpose: string;
  necessityAssessed: boolean;
  dpoConsulted: boolean;
  dpoName: string | null;
  supervisoryBody: string | null;
  risks: string[];
  mitigations: string[];
  riskLikelihood: number | null;
  riskImpact: number | null;
}

const LIKELIHOOD_OPTIONS = [
  { v: 1, label: "1 — Πολύ Απίθανο" },
  { v: 2, label: "2 — Απίθανο" },
  { v: 3, label: "3 — Μέτριο" },
  { v: 4, label: "4 — Πιθανό" },
  { v: 5, label: "5 — Πολύ Πιθανό" },
];

const IMPACT_OPTIONS = [
  { v: 1, label: "1 — Αμελητέα" },
  { v: 2, label: "2 — Μικρή" },
  { v: 3, label: "3 — Μέτρια" },
  { v: 4, label: "4 — Σοβαρή" },
  { v: 5, label: "5 — Πολύ Σοβαρή" },
];

export function DpiaEditForm({
  id, title, status, processingPurpose, necessityAssessed, dpoConsulted,
  dpoName, supervisoryBody, risks, mitigations, riskLikelihood, riskImpact,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Editable state
  const [purposeText, setPurposeText] = useState(processingPurpose);
  const [risksText, setRisksText] = useState(risks.join("\n"));
  const [mitigText, setMitigText] = useState(mitigations.join("\n"));

  // AI generation of risks + mitigations
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function suggestRisks() {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/dpia-risks-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, processingPurpose: purposeText }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data: { risks: string[]; mitigations: string[] } = await res.json();
      if (data.risks?.length) setRisksText(data.risks.join("\n"));
      if (data.mitigations?.length) setMitigText(data.mitigations.join("\n"));
    } catch (e: any) {
      setAiError(e.message ?? "Άγνωστο σφάλμα");
    } finally {
      setAiLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const fd = new FormData(e.currentTarget);

    // Convert line-by-line text to JSON arrays
    const risksArr = risksText.split("\n").map((s) => s.trim()).filter(Boolean);
    const mitigArr = mitigText.split("\n").map((s) => s.trim()).filter(Boolean);
    fd.set("risksIdentified", JSON.stringify(risksArr));
    fd.set("riskMitigation", JSON.stringify(mitigArr));

    startTransition(async () => {
      try {
        await updateDpia(fd);
        setSaved(true);
        router.refresh();
      } catch (e: any) {
        setError(e.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="id" value={id} />

      {/* Status + assessments */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Κατάσταση</label>
          <Select name="status" defaultValue={status}>
            <option value="DRAFT">Προσχέδιο</option>
            <option value="IN_REVIEW">Υπό Αξιολόγηση</option>
            <option value="APPROVED">Εγκεκριμένο</option>
            <option value="REQUIRES_CONSULTATION">Απαιτείται Διαβούλευση</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Αξιολόγηση Αναγκαιότητας</label>
          <Select name="necessityAssessed" defaultValue={necessityAssessed ? "true" : "false"}>
            <option value="true">Αξιολογήθηκε ✓</option>
            <option value="false">Εκκρεμεί</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Διαβούλευση ΥΠΔ</label>
          <Select name="dpoConsulted" defaultValue={dpoConsulted ? "true" : "false"}>
            <option value="true">Διαβουλεύτηκε ✓</option>
            <option value="false">Εκκρεμεί</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Όνομα ΥΠΔ</label>
          <Input name="dpoName" defaultValue={dpoName ?? ""} placeholder="Ονοματεπώνυμο ΥΠΔ" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Εποπτική Αρχή</label>
          <Input name="supervisoryBody" defaultValue={supervisoryBody ?? ""} placeholder="π.χ. ΑΠΔΠΧ" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Σκοπός Επεξεργασίας</label>
        <Textarea
          name="processingPurpose"
          value={purposeText}
          onChange={(e) => setPurposeText(e.target.value)}
          rows={4}
        />
      </div>

      {/* Risk scoring — feeds the risk matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Πιθανότητα (Likelihood)</label>
          <Select name="riskLikelihood" defaultValue={riskLikelihood?.toString() ?? ""}>
            <option value="">— Δεν έχει αξιολογηθεί —</option>
            {LIKELIHOOD_OPTIONS.map((o) => (
              <option key={o.v} value={o.v}>{o.label}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Επίπτωση (Impact)</label>
          <Select name="riskImpact" defaultValue={riskImpact?.toString() ?? ""}>
            <option value="">— Δεν έχει αξιολογηθεί —</option>
            {IMPACT_OPTIONS.map((o) => (
              <option key={o.v} value={o.v}>{o.label}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* AI suggestion for risks + mitigations */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/20 px-3 py-2.5">
        <span className="text-xs text-violet-800 dark:text-violet-300">
          Δημιουργία κινδύνων & μέτρων με AI βάσει τίτλου και σκοπού. (Αντικαθιστά τα παρακάτω πεδία.)
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={suggestRisks}
          disabled={aiLoading}
          className="shrink-0 gap-2 border-violet-300 text-violet-700 hover:bg-violet-100 dark:border-violet-700 dark:text-violet-400 dark:hover:bg-violet-950/40"
        >
          {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {aiLoading ? "Δημιουργία..." : "Πρόταση με AI"}
        </Button>
      </div>
      {aiError && <p className="text-sm text-red-600 dark:text-red-400">{aiError}</p>}

      {/* Risks + mitigations — one per line */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Κίνδυνοι <span className="font-normal opacity-60">(ένας ανά γραμμή)</span>
          </label>
          <textarea
            value={risksText}
            onChange={(e) => setRisksText(e.target.value)}
            rows={8}
            placeholder={"Μη εξουσιοδοτημένη πρόσβαση...\nΔιαρροή δεδομένων..."}
            className="w-full rounded-sm px-3 py-2 text-sm resize-y focus:outline-none"
            style={{ border: "1px solid #8a8886", background: "rgb(var(--card))", color: "rgb(var(--foreground))" }}
          />
          <p className="text-[11px] text-muted-foreground">{risksText.split("\n").filter(Boolean).length} κίνδυνοι</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Μέτρα Αντιμετώπισης <span className="font-normal opacity-60">(ένα ανά γραμμή)</span>
          </label>
          <textarea
            value={mitigText}
            onChange={(e) => setMitigText(e.target.value)}
            rows={8}
            placeholder={"Εφαρμογή RBAC...\nΚρυπτογράφηση TLS..."}
            className="w-full rounded-sm px-3 py-2 text-sm resize-y focus:outline-none"
            style={{ border: "1px solid #8a8886", background: "rgb(var(--card))", color: "rgb(var(--foreground))" }}
          />
          <p className="text-[11px] text-muted-foreground">{mitigText.split("\n").filter(Boolean).length} μέτρα</p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="text-sm text-green-600 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> Αποθηκεύτηκε
          </span>
        )}
        <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {isPending ? "Αποθήκευση..." : "Αποθήκευση Αλλαγών"}
        </Button>
      </div>
    </form>
  );
}
