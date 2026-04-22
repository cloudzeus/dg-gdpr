"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { createApiKey, toggleApiKey, deleteApiKey } from "@/actions/dsr";
import { useRouter } from "next/navigation";
import { MdAdd, MdDelete, MdContentCopy, MdCheck, MdKey, MdOpenInNew, MdPowerSettingsNew, MdWarning } from "react-icons/md";

type ApiKey = {
  id: string;
  name: string;
  description: string | null;
  key: string;
  isActive: boolean;
  createdAt: string;
  requestCount: number;
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} title="Αντιγραφή" className="flex items-center gap-1 text-[11px] rounded-sm px-2 py-1 transition-colors"
      style={{ color: copied ? "#107c10" : "rgb(0,120,212)", border: `1px solid ${copied ? "#107c10" : "rgba(0,120,212,0.3)"}`, background: copied ? "rgba(16,124,16,0.06)" : "rgba(0,120,212,0.06)" }}>
      {copied ? <MdCheck size={12} /> : <MdContentCopy size={12} />}
      {copied ? "Αντιγράφηκε!" : "Αντιγραφή"}
    </button>
  );
}

export function ApiKeysManager({ keys }: { keys: ApiKey[] }) {
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [origins, setOrigins] = useState("");
  const router = useRouter();

  const handleCreate = () => {
    if (!name.trim()) { setError("Απαιτείται όνομα"); return; }
    setError(null);
    startTransition(async () => {
      try {
        const result = await createApiKey({ name: name.trim(), description: description.trim() || undefined, allowedOrigins: origins.trim() || undefined });
        setNewKey(result.key);
        setName(""); setDescription(""); setOrigins("");
        router.refresh();
      } catch (e: any) { setError(e.message); }
    });
  };

  const handleToggle = (id: string, current: boolean) => {
    startTransition(async () => {
      try { await toggleApiKey(id, !current); router.refresh(); }
      catch (e: any) { setError(e.message); }
    });
  };

  const handleDelete = (k: ApiKey) => {
    if (!confirm(`Διαγραφή κλειδιού «${k.name}»;\nΟι ιστότοποι που το χρησιμοποιούν δεν θα μπορούν να στέλνουν αιτήματα.`)) return;
    startTransition(async () => {
      try { await deleteApiKey(k.id); router.refresh(); }
      catch (e: any) { setError(e.message); }
    });
  };

  const docsUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/docs`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-semibold" style={{ color: "rgb(var(--foreground))" }}>API Κλειδιά</h2>
          <p className="text-[13px] mt-0.5" style={{ color: "rgb(var(--muted-foreground))" }}>
            Δημιουργήστε κλειδιά για να ενσωματώσετε τα δικαιώματα GDPR στα websites σας.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/docs" target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[12px] font-semibold"
            style={{ border: "1px solid rgba(0,120,212,0.3)", color: "rgb(0,120,212)", background: "rgba(0,120,212,0.06)" }}>
            <MdOpenInNew size={13} /> API Docs
          </a>
          <button onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[12px] font-semibold text-white"
            style={{ background: "rgb(0,120,212)" }}>
            <MdAdd size={14} /> Νέο Κλειδί
          </button>
        </div>
      </div>

      {/* Docs info strip */}
      <div className="rounded-sm p-3 text-[12px]" style={{ background: "rgba(0,120,212,0.04)", border: "1px solid rgba(0,120,212,0.15)" }}>
        <strong>Πώς να ενσωματώσετε:</strong> Χρησιμοποιήστε το API key στο header <code style={{ background: "#edebe9", padding: "1px 5px", borderRadius: 2 }}>X-API-Key</code> σε κάθε αίτημα.
        {" "}<a href="/api/docs" target="_blank" rel="noreferrer" className="underline" style={{ color: "rgb(0,120,212)" }}>Δείτε την πλήρη τεκμηρίωση →</a>
      </div>

      {error && <p className="text-[12px]" style={{ color: "#d83b01" }}>{error}</p>}

      {keys.length === 0 && (
        <div className="rounded-sm p-8 text-center" style={{ border: "1px dashed rgb(var(--border))" }}>
          <MdKey size={32} style={{ color: "rgb(var(--muted-foreground))", margin: "0 auto 8px" }} />
          <p className="text-[13px]" style={{ color: "rgb(var(--muted-foreground))" }}>Δεν υπάρχουν κλειδιά ακόμα. Δημιουργήστε το πρώτο σας κλειδί.</p>
        </div>
      )}

      <div className="space-y-2">
        {keys.map((k) => (
          <div key={k.id} className="rounded-sm p-4" style={{ background: "rgb(var(--card))", border: "1px solid rgb(var(--border))" }}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <MdKey size={14} style={{ color: k.isActive ? "rgb(0,120,212)" : "rgb(var(--muted-foreground))" }} />
                  <span className="text-[14px] font-semibold" style={{ color: "rgb(var(--foreground))" }}>{k.name}</span>
                  {!k.isActive && (
                    <span className="text-[10px] rounded-sm px-1.5 py-0.5 font-semibold" style={{ background: "#fde7e9", color: "#d83b01" }}>ΑΝΕΝΕΡΓΟ</span>
                  )}
                  <span className="text-[11px]" style={{ color: "rgb(var(--muted-foreground))" }}>{k.requestCount} αιτήματα</span>
                </div>
                {k.description && <p className="text-[12px]" style={{ color: "rgb(var(--muted-foreground))" }}>{k.description}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <code className="text-[11px] rounded-sm px-2 py-1 font-mono" style={{ background: "rgb(var(--background))", border: "1px solid rgb(var(--border))", color: "rgb(var(--foreground))" }}>
                    {k.key.slice(0, 16)}••••••••••••••••{k.key.slice(-4)}
                  </code>
                  <CopyButton text={k.key} />
                </div>
                <p className="text-[10px]" style={{ color: "rgb(var(--muted-foreground))" }}>
                  Δημιουργήθηκε {new Date(k.createdAt).toLocaleDateString("el-GR")}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleToggle(k.id, k.isActive)} title={k.isActive ? "Απενεργοποίηση" : "Ενεργοποίηση"}
                  className="flex items-center gap-1 rounded-sm px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
                  style={{ border: "1px solid rgb(var(--border))", color: k.isActive ? "#ca5010" : "#107c10", background: k.isActive ? "rgba(202,80,16,0.06)" : "rgba(16,124,16,0.06)" }}>
                  <MdPowerSettingsNew size={13} />
                  {k.isActive ? "Απενεργοποίηση" : "Ενεργοποίηση"}
                </button>
                <button onClick={() => handleDelete(k)} title="Διαγραφή"
                  className="flex items-center justify-center rounded-sm transition-colors" style={{ width: 30, height: 30 }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(216,59,1,0.08)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <MdDelete size={15} style={{ color: "rgb(var(--muted-foreground))" }} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create modal */}
      <Modal open={creating || newKey !== null} onClose={() => { setCreating(false); setNewKey(null); }} title="Νέο API Κλειδί">
        {newKey ? (
          <div className="space-y-4">
            <div className="rounded-sm p-4" style={{ background: "rgba(16,124,16,0.06)", border: "1px solid rgba(16,124,16,0.3)" }}>
              <p className="text-[13px] font-semibold mb-2" style={{ color: "#107c10" }}>✓ Το κλειδί δημιουργήθηκε επιτυχώς!</p>
              <p className="text-[12px] mb-3" style={{ color: "rgb(var(--foreground))" }}>
                <strong>Αντιγράψτε το κλειδί τώρα</strong> — δεν θα εμφανιστεί ξανά για λόγους ασφαλείας.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[12px] rounded-sm px-3 py-2 font-mono break-all" style={{ background: "rgb(var(--background))", border: "1px solid rgb(var(--border))" }}>
                  {newKey}
                </code>
                <CopyButton text={newKey} />
              </div>
            </div>
            <div className="rounded-sm p-3 text-[12px]" style={{ background: "rgba(216,59,1,0.04)", border: "1px solid rgba(216,59,1,0.15)", color: "#d83b01" }}>
              <MdWarning size={13} style={{ display: "inline", marginRight: 4 }} />
              Αποθηκεύστε το κλειδί σε ασφαλές μέρος. Αν το χάσετε, θα πρέπει να δημιουργήσετε νέο.
            </div>
            <div className="flex justify-end">
              <button onClick={() => { setCreating(false); setNewKey(null); }} className="rounded-sm px-4 py-1.5 text-[13px] font-semibold text-white" style={{ background: "rgb(0,120,212)" }}>
                Κατανόησα, Κλείσιμο
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgb(var(--muted-foreground))" }}>Όνομα *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="π.χ. Website Εταιρείας, Mobile App" autoFocus />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgb(var(--muted-foreground))" }}>Περιγραφή</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Προαιρετική περιγραφή..." />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgb(var(--muted-foreground))" }}>Επιτρεπόμενα Origins (CORS)</label>
              <Input value={origins} onChange={(e) => setOrigins(e.target.value)} placeholder="https://mysite.gr, https://www.mysite.gr" />
              <p className="text-[11px]" style={{ color: "rgb(var(--muted-foreground))" }}>Χωρισμένα με κόμμα. Αφήστε κενό για να επιτρέπεται κάθε origin.</p>
            </div>
            {error && <p className="text-[12px]" style={{ color: "#d83b01" }}>{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setCreating(false)} className="rounded-sm px-4 py-1.5 text-[13px] font-semibold" style={{ border: "1px solid #8a8886", background: "rgb(var(--card))" }}>
                Ακύρωση
              </button>
              <button onClick={handleCreate} disabled={isPending} className="rounded-sm px-4 py-1.5 text-[13px] font-semibold text-white" style={{ background: isPending ? "rgba(0,120,212,0.6)" : "rgb(0,120,212)" }}>
                {isPending ? "Δημιουργία..." : "Δημιουργία Κλειδιού"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
