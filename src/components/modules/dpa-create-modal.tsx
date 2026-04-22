"use client";

import { useState, useTransition } from "react";
import { createDpaContract } from "@/actions/dpia";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { FiInfo, FiX, FiChevronRight, FiChevronLeft, FiDownload } from "react-icons/fi";

interface Project {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  projects: Project[];
}

type Step = 1 | 2 | 3;

const STEP_HELP: Record<Step, { title: string; text: string; article: string }> = {
  1: {
    title: "Στοιχεία Σύμβασης DPA",
    text: "Η Σύμβαση Επεξεργασίας Δεδομένων (DPA) ορίζει τους όρους βάσει των οποίων ο Εκτελών επεξεργάζεται δεδομένα εκ μέρους του Υπεύθυνου. Είναι υποχρεωτική για κάθε τρίτο πάροχο υπηρεσιών.",
    article: "Άρθρο 28 GDPR — Ο εκτελών επεξεργασίας: εγγυάται εμπιστευτικότητα, εφαρμόζει μέτρα ασφαλείας, ειδοποιεί για παραβιάσεις.",
  },
  2: {
    title: "Δεδομένα & Σκοποί",
    text: "Καθορίστε ποια κατηγορίες δεδομένων επεξεργάζεται ο Εκτελών και για ποιους σκοπούς. Η επεξεργασία πρέπει να περιορίζεται αυστηρά σε αυτό που ορίζει ο Υπεύθυνος.",
    article: "Άρθρο 28 §3 — Ο Εκτελών επεξεργάζεται μόνο κατόπιν τεκμηριωμένων εντολών του Υπεύθυνου.",
  },
  3: {
    title: "Ασφάλεια & Υποεκτελούντες",
    text: "Τεκμηριώστε τα τεχνικά και οργανωτικά μέτρα ασφαλείας. Αν χρησιμοποιούνται υποεκτελούντες (π.χ. cloud providers), απαιτείται γραπτή έγκριση του Υπεύθυνου.",
    article: "Άρθρα 28 §2, 32 GDPR — Κρυπτογράφηση, ψευδωνυμοποίηση, εμπιστευτικότητα, δοκιμές ασφαλείας.",
  },
};

export function DpaCreateModal({ open, onClose, projects }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [showHelp, setShowHelp] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  // Fields
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [controllerName, setControllerName] = useState("");
  const [processorName, setProcessorName] = useState("");
  const [dataCategories, setDataCategories] = useState("Στοιχεία επικοινωνίας, Οικονομικά δεδομένα");
  const [purposes, setPurposes] = useState("Ανάπτυξη λογισμικού\nΥποστήριξη ERP");
  const [retentionPeriod, setRetentionPeriod] = useState("5 χρόνια από λήξη σύμβασης");
  const [safeguards, setSafeguards] = useState("");
  const [subProcessors, setSubProcessors] = useState("");

  const handleSubmit = () => {
    const fd = new FormData();
    fd.append("projectId", projectId);
    fd.append("title", title);
    fd.append("controllerName", controllerName);
    fd.append("processorName", processorName);
    fd.append("dataCategories", dataCategories);
    fd.append("purposes", purposes);
    fd.append("retentionPeriod", retentionPeriod);
    fd.append("safeguards", safeguards);
    fd.append("subProcessors", subProcessors);

    setError(null);
    startTransition(async () => {
      try {
        const result = await createDpaContract(fd);
        setCreatedId(result.id);
      } catch (e: any) {
        setError(e.message);
      }
    });
  };

  const stepTitles = ["Στοιχεία", "Δεδομένα & Σκοποί", "Ασφάλεια"];

  if (createdId) {
    return (
      <Modal open={open} onClose={onClose} title="Σύμβαση DPA Δημιουργήθηκε" size="sm">
        <div className="text-center space-y-4 py-4">
          <div className="text-5xl">✅</div>
          <p className="font-semibold">Η σύμβαση δημιουργήθηκε επιτυχώς!</p>
          <a href={`/api/export/dpa?id=${createdId}`} download>
            <Button className="gap-2 w-full">
              <FiDownload className="h-4 w-4" /> Λήψη Word (.docx)
            </Button>
          </a>
          <Button variant="outline" onClick={onClose} className="w-full">Κλείσιμο</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Νέα Σύμβαση DPA (Άρθρο 28)"
      description="Δημιουργία σύμβασης επεξεργασίας δεδομένων — Word export"
      size="lg"
    >
      {/* Help panel */}
      {showHelp && (
        <div className="mb-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-4 relative">
          <button onClick={() => setShowHelp(false)} className="absolute right-3 top-3 text-blue-400 hover:text-blue-700">
            <FiX className="h-4 w-4" />
          </button>
          <p className="font-semibold text-sm text-blue-800 dark:text-blue-300 mb-1">ℹ️ {STEP_HELP[step].title}</p>
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
            <label className="text-sm font-medium">Τίτλος Σύμβασης *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="π.χ. DPA με SoftOne για ERP Integration" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Υπεύθυνος Επεξεργασίας (Controller) *</label>
              <Input value={controllerName} onChange={(e) => setControllerName(e.target.value)} placeholder="Ονομασία πελάτη" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Εκτελών Επεξεργασία (Processor) *</label>
              <Input value={processorName} onChange={(e) => setProcessorName(e.target.value)} placeholder="Ονομασία εταιρείας σας" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Σχετικό Έργο</label>
            <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Κατηγορίες Δεδομένων *</label>
            <p className="text-xs text-muted-foreground">Χωρίστε με κόμμα</p>
            <Textarea
              value={dataCategories}
              onChange={(e) => setDataCategories(e.target.value)}
              rows={2}
              placeholder="Στοιχεία επικοινωνίας, ΑΦΜ, Email, Τηλέφωνο..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Σκοποί Επεξεργασίας *</label>
            <p className="text-xs text-muted-foreground">Ένας σκοπός ανά γραμμή</p>
            <Textarea
              value={purposes}
              onChange={(e) => setPurposes(e.target.value)}
              rows={3}
              placeholder="Ανάπτυξη λογισμικού&#10;Υποστήριξη ERP&#10;Διαχείριση τιμολογίων"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Χρόνος Διατήρησης Δεδομένων</label>
            <Input
              value={retentionPeriod}
              onChange={(e) => setRetentionPeriod(e.target.value)}
              placeholder="π.χ. 5 χρόνια από λήξη σύμβασης"
            />
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Τεχνικά & Οργανωτικά Μέτρα Ασφαλείας</label>
            <Textarea
              value={safeguards}
              onChange={(e) => setSafeguards(e.target.value)}
              rows={3}
              placeholder="Κρυπτογράφηση AES-256, έλεγχος πρόσβασης RBAC, τακτικά backups, VPN, MFA..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Υποεκτελούντες (χωρίστε με κόμμα)</label>
            <Input
              value={subProcessors}
              onChange={(e) => setSubProcessors(e.target.value)}
              placeholder="π.χ. Microsoft Azure, Google Workspace"
            />
          </div>

          {/* Preview */}
          <div className="rounded-lg bg-secondary/50 p-3 text-sm space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Σύνοψη Σύμβασης</p>
            <p><span className="text-muted-foreground">Τίτλος:</span> {title}</p>
            <p><span className="text-muted-foreground">Controller:</span> {controllerName}</p>
            <p><span className="text-muted-foreground">Processor:</span> {processorName}</p>
            <p><span className="text-muted-foreground">Διατήρηση:</span> {retentionPeriod}</p>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive mt-3">{error}</p>}

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
            disabled={step === 1 && (!title || !controllerName || !processorName)}
            className="gap-1.5"
          >
            Επόμενο <FiChevronRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isPending} className="gap-1.5">
            {isPending ? "Δημιουργία..." : "Δημιουργία DPA"}
          </Button>
        )}
      </div>
    </Modal>
  );
}
