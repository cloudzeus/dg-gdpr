"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteDpia, deleteDpa } from "@/actions/dpia";
import { Trash2, Upload, FileCheck2, Loader2, ExternalLink } from "lucide-react";

interface Props {
  id: string;
  type: "dpia" | "dpa";
  signedDocUrl?: string | null;
  redirectOnDelete?: string;
}

export function DpiaDocumentActions({ id, type, signedDocUrl, redirectOnDelete = "/dpia" }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(signedDocUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleDelete() {
    if (!confirm(`Διαγραφή αυτής της ${type === "dpia" ? "DPIA" : "σύμβασης DPA"}; Η ενέργεια δεν αναιρείται.`)) return;
    startTransition(async () => {
      try {
        if (type === "dpia") await deleteDpia(id);
        else await deleteDpa(id);
        router.push(redirectOnDelete);
        router.refresh();
      } catch (e: any) {
        setError(e.message);
      }
    });
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("id", id);
      fd.append("type", type);
      const res = await fetch("/api/upload/signed-doc", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Σφάλμα μεταφόρτωσης");
      setUploadedUrl(data.url);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      {/* Signed document section */}
      <div className="rounded-lg border border-border p-3 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Υπογεγραμμένο Έγγραφο
        </p>
        {uploadedUrl ? (
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-green-500 shrink-0" />
            <span className="text-sm text-green-700 dark:text-green-400 font-medium flex-1 truncate">Υπογεγραμμένο αρχείο διαθέσιμο</span>
            <a href={uploadedUrl} target="_blank" rel="noreferrer" className="shrink-0">
              <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
                <ExternalLink className="h-3 w-3" /> Άνοιγμα
              </Button>
            </a>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-7 text-xs"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-3 w-3" /> Αντικατάσταση
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground flex-1">Δεν έχει ανέβει υπογεγραμμένο αρχείο</span>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {uploading ? "Μεταφόρτωση..." : "Μεταφόρτωση"}
            </Button>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,.png,.jpg"
          className="hidden"
          onChange={handleUpload}
        />
        <p className="text-[11px] text-muted-foreground">PDF, Word ή εικόνα υπογεγραμμένου εγγράφου και από τα δύο μέρη</p>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Delete */}
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5 w-full"
        onClick={handleDelete}
        disabled={isPending}
      >
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        {isPending ? "Διαγραφή..." : `Διαγραφή ${type === "dpia" ? "DPIA" : "Σύμβασης DPA"}`}
      </Button>
    </div>
  );
}
