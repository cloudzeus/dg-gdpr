"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createIntake } from "@/actions/intake";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Plus, Loader2 } from "lucide-react";

export function NewIntakeButton() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        const id = await createIntake(title);
        router.push(`/intake/${id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Σφάλμα");
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-1.5 shrink-0">
        <Plus className="h-4 w-4" /> Νέα Πρόσληψη
      </Button>
      {open && (
        <Modal open onClose={() => setOpen(false)} title="Νέα Πρόσληψη">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Τίτλος συνεργασίας *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="π.χ. Σύμβαση CRM — ΑΦΟΙ ΚΟΛΛΕΡΗ"
                required
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Τις εταιρίες θα τις επιβεβαιώσεις αργότερα, αφού ο οδηγός διαβάσει τα έγγραφα.
              </p>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Άκυρο</Button>
              <Button type="submit" disabled={pending || !title.trim()} className="gap-1.5">
                {pending && <Loader2 className="h-4 w-4 animate-spin" />} Δημιουργία
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
