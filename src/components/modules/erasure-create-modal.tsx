"use client";

import { useState, useTransition } from "react";
import { createErasureRequest } from "@/actions/erasure";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FiPlus, FiUser, FiMail, FiPhone, FiTrash2, FiInfo, FiX } from "react-icons/fi";

export function ErasureCreateButton() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        await createErasureRequest(formData);
        setOpen(false);
      } catch (e: any) {
        setError(e.message);
      }
    });
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="gap-2">
        <FiPlus className="h-4 w-4" /> Νέο Αίτημα Διαγραφής
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Νέο Αίτημα Διαγραφής"
        description="Δικαίωμα Λήθης — Άρθρο 17 GDPR"
        size="md"
      >
        {/* Help panel */}
        {showHelp ? (
          <div className="mb-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-4 relative">
            <button onClick={() => setShowHelp(false)} className="absolute right-3 top-3 text-blue-400 hover:text-blue-700">
              <FiX className="h-4 w-4" />
            </button>
            <p className="font-semibold text-sm text-blue-800 dark:text-blue-300 mb-1">ℹ️ Δικαίωμα Λήθης</p>
            <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
              Ο υπεύθυνος επεξεργασίας οφείλει να απαντήσει εντός <strong>30 ημερολογιακών ημερών</strong>.
              Τεκμηριώστε πλήρως την παραλαβή, την επαλήθευση ταυτότητας και το αποτέλεσμα.
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-500 bg-blue-100 dark:bg-blue-900/30 rounded px-2 py-1">
              📖 Άρθρο 17 GDPR — Εξαιρέσεις: νομικές υποχρεώσεις, δημόσιο συμφέρον, άσκηση νομικών αξιώσεων.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline mb-4"
          >
            <FiInfo className="h-3.5 w-3.5" /> Νομική Βάση & Οδηγίες
          </button>
        )}

        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <FiUser className="h-3.5 w-3.5" /> Ονοματεπώνυμο *
              </label>
              <Input name="subjectName" placeholder="Ονοματεπώνυμο υποκειμένου" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <FiMail className="h-3.5 w-3.5" /> Email *
              </label>
              <Input name="subjectEmail" type="email" placeholder="email@example.com" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <FiPhone className="h-3.5 w-3.5" /> Τηλέφωνο
              </label>
              <Input name="subjectPhone" placeholder="+30 210 0000000" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Ανατέθηκε σε</label>
              <Input name="assignedTo" placeholder="Ονοματεπώνυμο υπευθύνου" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <FiTrash2 className="h-3.5 w-3.5 text-destructive" /> Συστήματα προς Διαγραφή *
            </label>
            <Input
              name="systems"
              placeholder="π.χ. CRM, SoftOne ERP, Email Marketing (χωρίστε με κόμμα)"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Περιγραφή Αιτήματος *</label>
            <Textarea
              name="description"
              placeholder="Τι δεδομένα ζητά να διαγραφούν και από πού..."
              required
              rows={3}
            />
          </div>

          <div className="rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 p-3 text-xs text-orange-800 dark:text-orange-300">
            ⏱ Προθεσμία απάντησης: <strong>30 ημερολογιακές ημέρες</strong> από σήμερα. Η ημερομηνία καταγράφεται αυτόματα.
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Ακύρωση</Button>
            <Button type="submit" disabled={isPending} className="gap-1.5">
              <FiPlus className="h-3.5 w-3.5" />
              {isPending ? "Καταχώρηση..." : "Καταχώρηση Αιτήματος"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
