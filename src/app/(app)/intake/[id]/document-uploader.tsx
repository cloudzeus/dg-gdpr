// src/app/(app)/intake/[id]/document-uploader.tsx
"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addIntakeDocument, findDuplicateDocuments } from "@/actions/intake";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Loader2, Upload } from "lucide-react";

type Duplicate = { fileName: string; otherIntakeId: string; otherIntakeTitle: string };

/** Το είδος καθορίζει το prompt εξαγωγής — γι' αυτό εξηγούμε τι σημαίνει καθένα, όχι απλή ετικέτα. */
const KIND_HINT: Record<string, string> = {
  CONTRACT: "Η υπογεγραμμένη σύμβαση — θεμελιώνει τους συμβαλλόμενους.",
  OFFER: "Προσφορά ή πρόταση — περιγράφει αντικείμενο, όχι μέρη. Ο αντισυμβαλλόμενος θα επιβεβαιωθεί χειροκίνητα.",
  ANNEX: "Παράρτημα υπάρχουσας σύμβασης.",
  CORRESPONDENCE: "Email ή άλλη αλληλογραφία σχετική με τη συνεργασία.",
};

export function DocumentUploader({ intakeId }: { intakeId: string }) {
  const [kind, setKind] = useState("CONTRACT");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setError(null);
    setDuplicates([]);

    startTransition(async () => {
      for (const file of files) {
        try {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("kind", kind);
          await addIntakeDocument(intakeId, fd);
        } catch (err) {
          setError(err instanceof Error ? err.message : `Σφάλμα στο «${file.name}»`);
        }
      }
      try {
        setDuplicates(await findDuplicateDocuments(intakeId));
      } catch {
        // η προειδοποίηση διπλότυπου δεν είναι κρίσιμη — δεν εμποδίζει τη ροή
      }
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <div className="space-y-2 rounded-sm border border-dashed border-border p-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Είδος εγγράφου</label>
          <Select value={kind} onChange={(e) => setKind(e.target.value)} className="w-48" disabled={pending}>
            <option value="CONTRACT">Σύμβαση</option>
            <option value="OFFER">Προσφορά</option>
            <option value="ANNEX">Παράρτημα</option>
            <option value="CORRESPONDENCE">Αλληλογραφία</option>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={pending}
          className="gap-1.5"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {pending ? "Αποστολή..." : "Επιλογή αρχείων"}
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">{KIND_HINT[kind]}</p>
      <p className="text-[11px] text-muted-foreground">PDF, JPG, PNG, WEBP ή Word (.docx) · έως 20MB ανά αρχείο</p>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {duplicates.length > 0 && (
        <div
          className="rounded-sm px-3 py-2 text-xs space-y-1"
          style={{ background: "rgba(202,93,0,0.08)", border: "1px solid rgba(202,93,0,0.25)", color: "#ca5d00" }}
        >
          {duplicates.map((d) => (
            <p key={d.fileName + d.otherIntakeId}>
              Το «{d.fileName}» υπάρχει ήδη στην πρόσληψη{" "}
              <a href={`/intake/${d.otherIntakeId}`} className="underline">
                «{d.otherIntakeTitle}»
              </a>
              .
            </p>
          ))}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,application/pdf,image/jpeg,image/png,image/webp,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={handleFiles}
      />
    </div>
  );
}
