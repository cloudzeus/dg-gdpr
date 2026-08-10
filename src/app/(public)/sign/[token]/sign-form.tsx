"use client";

import { useState } from "react";

type Mode = "choice" | "electronic" | "upload" | "decline";
type Result = "signed" | "declined" | null;

const inputClass =
  "w-full rounded-md border border-[#8a8886] bg-white px-3 py-2 text-sm text-[#201F1E] outline-none transition-shadow placeholder:text-[#a19f9d] focus:border-[#0078D4] focus:ring-2 focus:ring-[#0078D4]/25";

async function postToken(token: string, form: FormData): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/sign/${token}`, { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data.error ?? "Παρουσιάστηκε σφάλμα. Δοκιμάστε ξανά." };
  return { ok: true };
}

export function SignForm({ token, recipientName }: { token: string; recipientName: string }) {
  const [mode, setMode] = useState<Mode>("choice");
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [signerName, setSignerName] = useState(recipientName ?? "");
  const [signerTitle, setSignerTitle] = useState("");
  const [agree, setAgree] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [reason, setReason] = useState("");

  function backToChoice() {
    setMode("choice");
    setError("");
  }

  async function submitElectronic(e: React.FormEvent) {
    e.preventDefault();
    if (!agree) {
      setError("Πρέπει να αποδεχτείτε ότι δεσμεύετε νόμιμα την εταιρία.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("mode", "electronic");
      form.set("signerName", signerName);
      form.set("signerTitle", signerTitle);
      form.set("agree", "true");
      const res = await postToken(token, form);
      if (!res.ok) { setError(res.error ?? ""); return; }
      setResult("signed");
    } finally {
      setBusy(false);
    }
  }

  async function submitUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Επιλέξτε αρχείο PDF.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("mode", "upload");
      form.set("file", file);
      const res = await postToken(token, form);
      if (!res.ok) { setError(res.error ?? ""); return; }
      setResult("signed");
    } finally {
      setBusy(false);
    }
  }

  async function submitDecline(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Περιγράψτε τον λόγο άρνησης.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("mode", "decline");
      form.set("reason", reason);
      const res = await postToken(token, form);
      if (!res.ok) { setError(res.error ?? ""); return; }
      setResult("declined");
    } finally {
      setBusy(false);
    }
  }

  if (result === "signed") {
    return (
      <div className="rounded-xl border bg-white p-8 text-center shadow-sm" style={{ borderColor: "#EDEBE9" }}>
        <p className="text-lg font-bold" style={{ color: "#107C10" }}>Η υπογραφή καταχωρίστηκε ✔</p>
        <p className="mt-2 text-sm" style={{ color: "#605E5C" }}>
          Σας ευχαριστούμε. Θα λάβετε σύντομα email επιβεβαίωσης με την ημερομηνία και ώρα καταχώρισης.
        </p>
      </div>
    );
  }

  if (result === "declined") {
    return (
      <div className="rounded-xl border bg-white p-8 text-center shadow-sm" style={{ borderColor: "#EDEBE9" }}>
        <p className="text-lg font-bold" style={{ color: "#A4262C" }}>Καταγράψαμε την άρνησή σας</p>
        <p className="mt-2 text-sm" style={{ color: "#605E5C" }}>Ο λόγος που δηλώσατε στάλθηκε στον αποστολέα του εγγράφου.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm" style={{ borderColor: "#EDEBE9" }}>
      {mode === "choice" && (
        <div className="space-y-3">
          <p className="text-sm font-semibold" style={{ color: "#201F1E" }}>Πώς θέλετε να προχωρήσετε;</p>
          <button
            onClick={() => setMode("electronic")}
            className="w-full rounded-md py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ background: "#0078D4" }}
          >
            Ηλεκτρονική υπογραφή
          </button>
          <button
            onClick={() => setMode("upload")}
            className="w-full rounded-md border py-2.5 text-sm font-semibold transition-colors hover:bg-[#faf9f8]"
            style={{ borderColor: "#0078D4", color: "#0078D4" }}
          >
            Ανέβασμα υπογεγραμμένου PDF
          </button>
          <button
            onClick={() => setMode("decline")}
            className="w-full py-2 text-center text-sm font-medium transition-opacity hover:opacity-80"
            style={{ color: "#A4262C" }}
          >
            Άρνηση υπογραφής
          </button>
        </div>
      )}

      {mode === "electronic" && (
        <form onSubmit={submitElectronic} className="space-y-4">
          <p className="text-sm font-semibold" style={{ color: "#201F1E" }}>Ηλεκτρονική υπογραφή</p>
          <div>
            <label className="block text-sm font-medium mb-1">Ονοματεπώνυμο *</label>
            <input required value={signerName} onChange={(e) => setSignerName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ιδιότητα *</label>
            <input
              required
              value={signerTitle}
              onChange={(e) => setSignerTitle(e.target.value)}
              placeholder="π.χ. Νόμιμος Εκπρόσωπος"
              className={inputClass}
            />
          </div>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm" style={{ color: "#201F1E" }}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0078D4]" />
            <span>Δηλώνω ότι έχω την εξουσιοδότηση να δεσμεύσω νόμιμα την εταιρία μου με την παρούσα υπογραφή.</span>
          </label>
          <p className="text-xs leading-relaxed" style={{ color: "#605E5C" }}>
            Καταγράφονται η ημερομηνία, η ώρα, η IP διεύθυνση και η συσκευή σας ως αρχείο ελέγχου της απλής ηλεκτρονικής υπογραφής (eIDAS).
          </p>
          {error && <p className="rounded-md border border-[#f3d6d8] bg-[#fdf3f4] px-3 py-2 text-sm text-[#a4262c]">{error}</p>}
          <div className="flex items-center gap-3 pt-1">
            <button type="button" onClick={backToChoice} className="text-sm font-medium" style={{ color: "#605E5C" }}>← Πίσω</button>
            <button
              type="submit"
              disabled={busy}
              className="ml-auto rounded-md px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "#0078D4" }}
            >
              {busy ? "Υποβολή…" : "Υπογραφή"}
            </button>
          </div>
        </form>
      )}

      {mode === "upload" && (
        <form onSubmit={submitUpload} className="space-y-4">
          <p className="text-sm font-semibold" style={{ color: "#201F1E" }}>Ανέβασμα υπογεγραμμένου</p>
          <div>
            <label className="block text-sm font-medium mb-1">Υπογεγραμμένο PDF (έως 20MB) *</label>
            <input
              required
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
          </div>
          {error && <p className="rounded-md border border-[#f3d6d8] bg-[#fdf3f4] px-3 py-2 text-sm text-[#a4262c]">{error}</p>}
          <div className="flex items-center gap-3 pt-1">
            <button type="button" onClick={backToChoice} className="text-sm font-medium" style={{ color: "#605E5C" }}>← Πίσω</button>
            <button
              type="submit"
              disabled={busy}
              className="ml-auto rounded-md px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "#0078D4" }}
            >
              {busy ? "Αποστολή…" : "Ανέβασμα"}
            </button>
          </div>
        </form>
      )}

      {mode === "decline" && (
        <form onSubmit={submitDecline} className="space-y-4">
          <p className="text-sm font-semibold" style={{ color: "#201F1E" }}>Άρνηση υπογραφής</p>
          <div>
            <label className="block text-sm font-medium mb-1">Λόγος άρνησης *</label>
            <textarea required value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={inputClass} />
          </div>
          {error && <p className="rounded-md border border-[#f3d6d8] bg-[#fdf3f4] px-3 py-2 text-sm text-[#a4262c]">{error}</p>}
          <div className="flex items-center gap-3 pt-1">
            <button type="button" onClick={backToChoice} className="text-sm font-medium" style={{ color: "#605E5C" }}>← Πίσω</button>
            <button
              type="submit"
              disabled={busy}
              className="ml-auto rounded-md px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "#A4262C" }}
            >
              {busy ? "Υποβολή…" : "Καταχώριση άρνησης"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
