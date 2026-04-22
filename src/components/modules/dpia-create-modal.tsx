"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDpia } from "@/actions/dpia";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { FiAlertTriangle, FiCheckCircle, FiChevronRight, FiChevronLeft, FiInfo, FiX } from "react-icons/fi";

interface Project {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  projects: Project[];
  defaultCompany?: string;
}

const STEP_HELP: Record<Step, { title: string; text: string; article: string }> = {
  1: {
    title: "Βασικά Στοιχεία DPIA",
    text: "Η Εκτίμηση Αντικτύπου (DPIA) είναι υποχρεωτική όταν η επεξεργασία ενδέχεται να εγκυμονεί υψηλό κίνδυνο για τα δικαιώματα των φυσικών προσώπων. Περιγράψτε με σαφήνεια τον σκοπό και τα δεδομένα που επεξεργάζεστε.",
    article: "Άρθρο 35 GDPR — Υποχρεωτική DPIA για: βιομετρικά, παρακολούθηση, επεξεργασία ευαίσθητων δεδομένων σε μεγάλη κλίμακα.",
  },
  2: {
    title: "Εκτίμηση Κινδύνου",
    text: "Αναγνωρίστε τους πιθανούς κινδύνους για τα δικαιώματα και τις ελευθερίες των υποκειμένων. Για κάθε κίνδυνο, ορίστε μέτρα μείωσης. Αν οι κίνδυνοι δεν μειωθούν, απαιτείται προηγούμενη διαβούλευση με την ΑΠΔΠΧ.",
    article: "Άρθρο 35 §7 — Η DPIA πρέπει να περιλαμβάνει αξιολόγηση κινδύνων και μέτρα αντιμετώπισης.",
  },
  3: {
    title: "ΥΠΔ & Επιβεβαίωση",
    text: "Εάν ο κίνδυνος παραμένει υψηλός μετά τα μέτρα, υποχρεωτική προηγούμενη διαβούλευση με την ΑΠΔΠΧ (Άρθρο 36). Ο ΥΠΔ πρέπει να συμμετέχει και να παρέχει συμβουλευτική γνώμη.",
    article: "Άρθρο 35 §2 — Ο υπεύθυνος ζητά τη γνώμη του ΥΠΔ κατά τη διεξαγωγή DPIA.",
  },
};

const RISK_PRESETS = [
  "Μη εξουσιοδοτημένη πρόσβαση σε δεδομένα",
  "Απώλεια δεδομένων (data loss)",
  "Διαρροή εμπιστευτικών πληροφοριών",
  "Παραβίαση δεδομένων από τρίτους",
  "Μη νόμιμη επεξεργασία",
  "Επεξεργασία πέραν του αναγκαίου",
];

const MITIGATION_PRESETS = [
  "Κρυπτογράφηση δεδομένων σε ηρεμία και μεταφορά",
  "Πολιτική ελέγχου πρόσβασης (RBAC)",
  "Τακτικά backup & disaster recovery",
  "Εκπαίδευση προσωπικού GDPR",
  "Δοκιμές διείσδυσης (penetration testing)",
  "Ψευδωνυμοποίηση ευαίσθητων δεδομένων",
];

type Step = 1 | 2 | 3;

export function DpiaCreateModal({ open, onClose, projects, defaultCompany }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [showHelp, setShowHelp] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Step 1: Basic info
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [processingPurpose, setProcessingPurpose] = useState("");

  // Step 2: Risk assessment
  const [risks, setRisks] = useState<string[]>([]);
  const [customRisk, setCustomRisk] = useState("");
  const [mitigations, setMitigations] = useState<string[]>([]);
  const [customMitigation, setCustomMitigation] = useState("");

  // Step 3: DPO
  const [necessityAssessed, setNecessityAssessed] = useState(false);
  const [dpoConsulted, setDpoConsulted] = useState(false);
  const [dpoName, setDpoName] = useState("");

  const toggleRisk = (r: string) =>
    setRisks((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);

  const toggleMitigation = (m: string) =>
    setMitigations((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);

  const handleSubmit = () => {
    if (!projectId || !title || !processingPurpose) {
      setError("Συμπληρώστε όλα τα υποχρεωτικά πεδία (Βήμα 1)");
      setStep(1);
      return;
    }

    const fd = new FormData();
    fd.append("projectId", projectId);
    fd.append("title", title);
    fd.append("processingPurpose", processingPurpose);
    fd.append("risksIdentified", JSON.stringify(risks));
    fd.append("riskMitigation", JSON.stringify(mitigations));
    if (necessityAssessed) fd.append("necessityAssessed", "on");
    if (dpoConsulted) fd.append("dpoConsulted", "on");
    if (dpoName) fd.append("dpoName", dpoName);

    setError(null);
    startTransition(async () => {
      try {
        const result = await createDpia(fd);
        onClose();
        router.push(`/dpia/${result.id}`);
      } catch (e: any) {
        setError(e.message);
      }
    });
  };

  const stepTitles = ["Βασικά Στοιχεία", "Εκτίμηση Κινδύνου", "ΥΠΔ & Επιβεβαίωση"];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Νέα Εκτίμηση Αντικτύπου (DPIA)"
      description="Οδηγός δημιουργίας DPIA — GDPR Άρθρο 35"
      size="lg"
    >
      {/* Help panel */}
      {showHelp && (
        <div className="mb-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-4 relative">
          <button
            onClick={() => setShowHelp(false)}
            className="absolute right-3 top-3 text-blue-400 hover:text-blue-700"
          >
            <FiX className="h-4 w-4" />
          </button>
          <p className="font-semibold text-sm text-blue-800 dark:text-blue-300 mb-1">
            ℹ️ {STEP_HELP[step].title}
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">{STEP_HELP[step].text}</p>
          <p className="text-xs text-blue-600 dark:text-blue-500 bg-blue-100 dark:bg-blue-900/30 rounded px-2 py-1">
            📖 {STEP_HELP[step].article}
          </p>
        </div>
      )}

      {/* Step indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2 gap-2">
          {stepTitles.map((t, i) => (
            <div key={t} className="flex items-center gap-1.5">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                i + 1 < step ? "bg-green-500 text-white" :
                i + 1 === step ? "bg-primary text-white" :
                "bg-secondary text-muted-foreground"
              }`}>
                {i + 1 < step ? "✓" : i + 1}
              </span>
              <span className={`text-xs ${i + 1 === step ? "font-semibold" : "text-muted-foreground"}`}>{t}</span>
              {i < 2 && <FiChevronRight className="h-3.5 w-3.5 text-muted-foreground mx-1" />}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline"
            title="Οδηγίες βήματος"
          >
            <FiInfo className="h-3.5 w-3.5" /> Βοήθεια
          </button>
        </div>
        <Progress value={(step / 3) * 100} />
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Project / Εφαρμογή *</label>
            <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Τίτλος DPIA *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="π.χ. DPIA — Σύστημα Βιομετρικής Παρακολούθησης"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Σκοπός & Περιγραφή Επεξεργασίας *</label>
            <Textarea
              value={processingPurpose}
              onChange={(e) => setProcessingPurpose(e.target.value)}
              rows={4}
              placeholder="Περιγράψτε αναλυτικά τον σκοπό επεξεργασίας, τα δεδομένα, τα υποκείμενα και τους λόγους αναγκαιότητας..."
            />
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <FiAlertTriangle className="h-3.5 w-3.5 text-orange-500" />
              Κίνδυνοι — επιλέξτε ή προσθέστε
            </label>
            <div className="grid grid-cols-2 gap-2">
              {RISK_PRESETS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRisk(r)}
                  className={`text-left text-xs rounded-lg border px-3 py-2 transition-all ${
                    risks.includes(r)
                      ? "border-orange-400 bg-orange-50 dark:bg-orange-950/20 text-orange-800 dark:text-orange-300"
                      : "border-border hover:border-orange-300"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={customRisk}
                onChange={(e) => setCustomRisk(e.target.value)}
                placeholder="Προσθήκη κινδύνου..."
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customRisk.trim()) {
                    setRisks((prev) => [...prev, customRisk.trim()]);
                    setCustomRisk("");
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (customRisk.trim()) {
                    setRisks((prev) => [...prev, customRisk.trim()]);
                    setCustomRisk("");
                  }
                }}
              >
                +
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <FiCheckCircle className="h-3.5 w-3.5 text-green-500" />
              Μέτρα Μείωσης Κινδύνου
            </label>
            <div className="grid grid-cols-2 gap-2">
              {MITIGATION_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMitigation(m)}
                  className={`text-left text-xs rounded-lg border px-3 py-2 transition-all ${
                    mitigations.includes(m)
                      ? "border-green-400 bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300"
                      : "border-border hover:border-green-300"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={customMitigation}
                onChange={(e) => setCustomMitigation(e.target.value)}
                placeholder="Προσθήκη μέτρου..."
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customMitigation.trim()) {
                    setMitigations((prev) => [...prev, customMitigation.trim()]);
                    setCustomMitigation("");
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (customMitigation.trim()) {
                    setMitigations((prev) => [...prev, customMitigation.trim()]);
                    setCustomMitigation("");
                  }
                }}
              >
                +
              </Button>
            </div>
          </div>

          {risks.length > 0 && (
            <div className="rounded-lg bg-orange-50 dark:bg-orange-950/20 p-3 text-xs text-orange-800 dark:text-orange-300">
              <p className="font-semibold mb-1">{risks.length} κίνδυνοι — {mitigations.length} μέτρα</p>
              {risks.length > mitigations.length && (
                <p>⚠ Βεβαιωθείτε ότι κάθε κίνδυνος έχει αντίστοιχο μέτρο αντιμετώπισης</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-border p-3 hover:bg-secondary/40 transition-colors">
              <input
                type="checkbox"
                checked={necessityAssessed}
                onChange={(e) => setNecessityAssessed(e.target.checked)}
                className="mt-0.5 rounded border-border"
              />
              <div>
                <p className="text-sm font-medium">Αξιολόγηση Αναγκαιότητας & Αναλογικότητας</p>
                <p className="text-xs text-muted-foreground">Επιβεβαιώνω ότι η επεξεργασία είναι αναγκαία και αναλογική προς τον σκοπό (Άρθρο 35 §7(b))</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-border p-3 hover:bg-secondary/40 transition-colors">
              <input
                type="checkbox"
                checked={dpoConsulted}
                onChange={(e) => setDpoConsulted(e.target.checked)}
                className="mt-0.5 rounded border-border"
              />
              <div>
                <p className="text-sm font-medium">Διαβούλευση με ΥΠΔ (DPO)</p>
                <p className="text-xs text-muted-foreground">Υποχρεωτική διαβούλευση με τον Υπεύθυνο Προστασίας Δεδομένων (Άρθρο 35 §2)</p>
              </div>
            </label>

            {dpoConsulted && (
              <div className="space-y-1.5 pl-4">
                <label className="text-sm font-medium">Ονοματεπώνυμο ΥΠΔ</label>
                <Input
                  value={dpoName}
                  onChange={(e) => setDpoName(e.target.value)}
                  placeholder="Ονοματεπώνυμο ΥΠΔ"
                />
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="rounded-lg bg-secondary/50 p-3 space-y-1 text-sm">
            <p className="font-semibold text-xs text-muted-foreground uppercase mb-2">Σύνοψη DPIA</p>
            <p><span className="text-muted-foreground">Τίτλος:</span> {title}</p>
            <p><span className="text-muted-foreground">Κίνδυνοι:</span> {risks.length}</p>
            <p><span className="text-muted-foreground">Μέτρα:</span> {mitigations.length}</p>
            <p><span className="text-muted-foreground">Αναγκαιότητα:</span> {necessityAssessed ? "✓ Αξιολογήθηκε" : "✗ Εκκρεμεί"}</p>
            <p><span className="text-muted-foreground">ΥΠΔ:</span> {dpoConsulted ? `✓ ${dpoName || "Ναι"}` : "✗ Εκκρεμεί"}</p>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive mt-3">{error}</p>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
        <Button
          type="button"
          variant="ghost"
          onClick={step === 1 ? onClose : () => { setStep((s) => (s - 1) as Step); setShowHelp(false); }}
          className="gap-1.5"
        >
          <FiChevronLeft className="h-3.5 w-3.5" />
          {step === 1 ? "Ακύρωση" : "Πίσω"}
        </Button>

        {step < 3 ? (
          <Button
            type="button"
            onClick={() => { setStep((s) => (s + 1) as Step); setShowHelp(false); }}
            disabled={step === 1 && (!title || !processingPurpose || !projectId)}
            className="gap-1.5"
          >
            Επόμενο <FiChevronRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="gap-1.5"
          >
            {isPending ? "Αποθήκευση..." : "Δημιουργία DPIA"}
          </Button>
        )}
      </div>
    </Modal>
  );
}
