"use client";

import { useState, useRef } from "react";
import { uploadLogo } from "@/actions/organization";
import { Loader2 } from "lucide-react";
import { MdCloudUpload, MdImage } from "react-icons/md";

export function LogoUploader({ currentLogo }: { currentLogo: string | null }) {
  const [preview, setPreview] = useState<string | null>(currentLogo);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const result = await uploadLogo(fd);
      setPreview(result.logo + "?t=" + Date.now());
      setSuccess(true);
    } catch (e: any) {
      setError(e.message ?? "Σφάλμα αποστολής");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        {/* Preview */}
        <div
          className="flex h-20 w-40 items-center justify-center rounded border-2 border-dashed cursor-pointer transition-colors"
          style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--secondary))" }}
          onClick={() => inputRef.current?.click()}
        >
          {preview ? (
            <img src={preview} alt="Logo" className="h-full w-full object-contain rounded p-1" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <MdImage size={24} />
              <span className="text-[11px]">Κλικ για upload</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            style={{ background: "rgba(0,120,212,0.1)", color: "#0078d4", border: "1px solid rgba(0,120,212,0.25)" }}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MdCloudUpload size={16} />
            )}
            {loading ? "Αποστολή..." : "Επιλογή αρχείου"}
          </button>
          <p className="text-[11px] text-muted-foreground">JPG, PNG, WEBP, SVG · έως 5MB</p>
          {error && <p className="text-[11px] text-destructive">{error}</p>}
          {success && <p className="text-[11px]" style={{ color: "#107c10" }}>✓ Logo αποθηκεύτηκε στο CDN</p>}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
