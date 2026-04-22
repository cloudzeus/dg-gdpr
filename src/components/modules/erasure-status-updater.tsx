"use client";

import { useState, useTransition } from "react";
import { updateErasureStatus } from "@/actions/erasure";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const statusOptions = [
  { value: "PENDING", label: "Εκκρεμεί" },
  { value: "IN_PROGRESS", label: "Σε Εξέλιξη" },
  { value: "COMPLETED", label: "Ολοκληρώθηκε" },
  { value: "PARTIAL", label: "Μερική Διαγραφή" },
  { value: "REJECTED", label: "Απορρίφθηκε" },
];

export function ErasureStatusUpdater({
  id,
  currentStatus,
  notes,
}: {
  id: string;
  currentStatus: string;
  notes: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [noteText, setNoteText] = useState(notes);
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      await updateErasureStatus(id, status, noteText);
      setExpanded(false);
    });
  };

  if (!expanded) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setExpanded(true)}
        className="text-xs"
      >
        Ενημέρωση Κατάστασης
      </Button>
    );
  }

  return (
    <div className="space-y-3 pt-2 border-t border-border">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Κατάσταση</label>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Σημειώσεις (π.χ. ποια συστήματα διαγράφηκαν)</label>
        <Textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          rows={2}
          placeholder="Καταγράψτε τις ενέργειες που έγιναν..."
          className="text-sm"
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? "Αποθήκευση..." : "Αποθήκευση"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setExpanded(false)}>
          Ακύρωση
        </Button>
      </div>
    </div>
  );
}
