"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { updateDpia } from "@/actions/dpia";
import { CheckCircle2, Loader2 } from "lucide-react";

interface Props {
  id: string;
  status: string;
  processingPurpose: string;
  necessityAssessed: boolean;
  dpoConsulted: boolean;
  dpoName: string | null;
  supervisoryBody: string | null;
  risks: string[];
  mitigations: string[];
}

export function DpiaEditForm({
  id, status, processingPurpose, necessityAssessed, dpoConsulted,
  dpoName, supervisoryBody, risks, mitigations,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Editable state
  const [risksText, setRisksText] = useState(risks.join("\n"));
  const [mitigText, setMitigText] = useState(mitigations.join("\n"));

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
        <Textarea name="processingPurpose" defaultValue={processingPurpose} rows={4} />
      </div>

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
