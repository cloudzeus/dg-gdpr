"use client";

import { useState, useTransition, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { updateDsrStatus, deleteDsrRequest } from "@/actions/dsr";
import { useRouter } from "next/navigation";
import {
  MdSearch, MdFilterList, MdEmail, MdDelete, MdEdit, MdWarning,
  MdCheckCircle, MdSchedule, MdPersonOff, MdDownload, MdVisibility,
  MdBlock,
} from "react-icons/md";

type DsrRequest = {
  id: string;
  type: string;
  status: string;
  subjectName: string;
  subjectEmail: string;
  subjectPhone: string | null;
  description: string | null;
  assignedTo: string | null;
  responseText: string | null;
  createdAt: string;
  completedAt: string | null;
  apiKeyName: string | null;
};

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  ERASURE:          { label: "Διαγραφή (Άρ.17)", color: "#d83b01" },
  PORTABILITY:      { label: "Φορητότητα (Άρ.20)", color: "#0078d4" },
  ACCESS:           { label: "Πρόσβαση (Άρ.15)", color: "#107c10" },
  RECTIFICATION:    { label: "Διόρθωση (Άρ.16)", color: "#ca5010" },
  OBJECTION:        { label: "Εναντίωση (Άρ.21)", color: "#8764b8" },
  RESTRICTION:      { label: "Περιορισμός (Άρ.18)", color: "#605e5c" },
  WITHDRAW_CONSENT: { label: "Ανάκλ. Συγκατάθεσης", color: "#8a8886" },
};

const STATUS_LABELS: Record<string, { label: string; variant: "secondary" | "warning" | "success" | "destructive" }> = {
  PENDING:     { label: "Εκκρεμεί", variant: "warning" },
  IN_PROGRESS: { label: "Σε Εξέλιξη", variant: "secondary" },
  COMPLETED:   { label: "Ολοκληρώθηκε", variant: "success" },
  REJECTED:    { label: "Απορρίφθηκε", variant: "destructive" },
  PARTIAL:     { label: "Μερική", variant: "secondary" },
};

function daysOpen(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
}

export function DsrManager({ requests }: { requests: DsrRequest[] }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selected, setSelected] = useState<DsrRequest | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return requests.filter((r) => {
      if (typeFilter !== "ALL" && r.type !== typeFilter) return false;
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (!q) return true;
      return r.subjectName.toLowerCase().includes(q) || r.subjectEmail.toLowerCase().includes(q);
    });
  }, [requests, query, typeFilter, statusFilter]);

  const handleDelete = (r: DsrRequest) => {
    if (!confirm(`Διαγραφή αιτήματος από ${r.subjectName};`)) return;
    startTransition(async () => {
      try { await deleteDsrRequest(r.id); router.refresh(); }
      catch (e: any) { setError(e.message); }
    });
  };

  const pending = requests.filter((r) => r.status === "PENDING").length;
  const overdue = requests.filter((r) => ["PENDING", "IN_PROGRESS"].includes(r.status) && daysOpen(r.createdAt) > 25).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Σύνολο", value: requests.length, color: "rgb(0,120,212)" },
          { label: "Εκκρεμή", value: pending, color: "#ca5010" },
          { label: "Επείγοντα (>25η)", value: overdue, color: "#d83b01" },
          { label: "Ολοκληρωμένα", value: requests.filter((r) => r.status === "COMPLETED").length, color: "#107c10" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-sm p-3 bg-card" style={{ border: "1px solid rgb(var(--border))" }}>
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgb(var(--muted-foreground))" }}>{label}</p>
            <p className="text-[24px] font-bold mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {overdue > 0 && (
        <div className="flex items-center gap-2 rounded-sm px-3 py-2 text-[12px]"
          style={{ background: "rgba(216,59,1,0.06)", border: "1px solid rgba(216,59,1,0.2)", color: "#d83b01" }}>
          <MdWarning size={14} />
          <strong>{overdue} αιτήματα</strong> εκκρεμούν πάνω από 25 ημέρες — η νομική προθεσμία 30 ημερών πλησιάζει!
        </div>
      )}

      {error && <p className="text-[12px]" style={{ color: "#d83b01" }}>{error}</p>}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 rounded-sm px-2 py-1.5 bg-card" style={{ border: "1px solid rgb(var(--border))" }}>
          <MdSearch size={14} style={{ color: "rgb(var(--muted-foreground))" }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Αναζήτηση..." className="bg-transparent text-[12px] outline-none w-36" />
        </div>
        <div className="flex items-center gap-1.5 rounded-sm px-2 py-1.5 bg-card" style={{ border: "1px solid rgb(var(--border))" }}>
          <MdFilterList size={14} style={{ color: "rgb(var(--muted-foreground))" }} />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-transparent text-[12px] outline-none">
            <option value="ALL">Όλοι οι τύποι</option>
            {Object.entries(TYPE_LABELS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5 rounded-sm px-2 py-1.5 bg-card" style={{ border: "1px solid rgb(var(--border))" }}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-transparent text-[12px] outline-none">
            <option value="ALL">Όλες οι καταστάσεις</option>
            {Object.entries(STATUS_LABELS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
          </select>
        </div>
        <span className="ml-auto text-[12px]" style={{ color: "rgb(var(--muted-foreground))" }}>{filtered.length} / {requests.length}</span>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgb(var(--border))", background: "rgba(0,0,0,0.02)" }}>
                {["Υποκείμενο", "Τύπος", "Κατάσταση", "Ημέρες", "API", "Ενέργειες"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: "rgb(var(--muted-foreground))" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[13px]" style={{ color: "rgb(var(--muted-foreground))" }}>
                  Δεν βρέθηκαν αιτήματα
                </td></tr>
              )}
              {filtered.map((r) => {
                const days = daysOpen(r.createdAt);
                const isOverdue = ["PENDING", "IN_PROGRESS"].includes(r.status) && days > 25;
                const typeInfo = TYPE_LABELS[r.type];
                const statusInfo = STATUS_LABELS[r.status];
                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid rgb(var(--border))" }}
                    className="hover:bg-[rgba(0,120,212,0.03)] transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-medium" style={{ color: "rgb(var(--foreground))" }}>{r.subjectName}</p>
                      <p className="text-[11px]" style={{ color: "rgb(var(--muted-foreground))" }}>{r.subjectEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-semibold rounded-sm px-2 py-0.5"
                        style={{ color: typeInfo?.color ?? "rgb(var(--foreground))", background: `${typeInfo?.color ?? "#000"}15`, border: `1px solid ${typeInfo?.color ?? "#000"}30` }}>
                        {typeInfo?.label ?? r.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusInfo?.variant ?? "secondary"}>{statusInfo?.label ?? r.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] font-semibold" style={{ color: isOverdue ? "#d83b01" : days > 20 ? "#ca5010" : "rgb(var(--muted-foreground))" }}>
                        {isOverdue && "⚠ "}{days}η
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px]" style={{ color: "rgb(var(--muted-foreground))" }}>
                      {r.apiKeyName ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setSelected(r)} title="Προβολή / Επεξεργασία"
                          className="flex items-center justify-center rounded-sm transition-colors" style={{ width: 28, height: 28 }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.06)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                          <MdEdit size={15} style={{ color: "rgb(var(--muted-foreground))" }} />
                        </button>
                        <button onClick={() => handleDelete(r)} title="Διαγραφή"
                          className="flex items-center justify-center rounded-sm transition-colors" style={{ width: 28, height: 28 }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(216,59,1,0.08)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                          <MdDelete size={15} style={{ color: "rgb(var(--muted-foreground))" }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {selected && (
        <DsrDetailModal
          request={selected}
          onClose={() => { setSelected(null); router.refresh(); }}
        />
      )}
    </div>
  );
}

function DsrDetailModal({ request: r, onClose }: { request: DsrRequest; onClose: () => void }) {
  const [status, setStatus] = useState(r.status);
  const [assignedTo, setAssignedTo] = useState(r.assignedTo ?? "");
  const [responseText, setResponseText] = useState(r.responseText ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const typeInfo = TYPE_LABELS[r.type];
  const days = daysOpen(r.createdAt);

  const handleSave = () => {
    setError(null); setSaved(false);
    startTransition(async () => {
      try {
        await updateDsrStatus(r.id, { status, assignedTo: assignedTo || undefined, responseText: responseText || undefined });
        setSaved(true);
      } catch (e: any) { setError(e.message); }
    });
  };

  return (
    <Modal open onClose={onClose} title={`Αίτημα: ${r.subjectName}`} size="lg">
      <div className="space-y-4">
        {/* Subject info */}
        <div className="grid grid-cols-2 gap-3 rounded-sm p-3" style={{ background: "rgba(0,120,212,0.04)", border: "1px solid rgba(0,120,212,0.15)" }}>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "rgb(var(--muted-foreground))" }}>Υποκείμενο</p>
            <p className="text-[13px] font-medium">{r.subjectName}</p>
            <p className="text-[12px]" style={{ color: "rgb(var(--muted-foreground))" }}>{r.subjectEmail}</p>
            {r.subjectPhone && <p className="text-[12px]" style={{ color: "rgb(var(--muted-foreground))" }}>{r.subjectPhone}</p>}
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "rgb(var(--muted-foreground))" }}>Αίτημα</p>
            <span className="text-[11px] font-semibold rounded-sm px-2 py-0.5"
              style={{ color: typeInfo?.color, background: `${typeInfo?.color}15`, border: `1px solid ${typeInfo?.color}30` }}>
              {typeInfo?.label ?? r.type}
            </span>
            <p className="text-[11px] mt-1" style={{ color: days > 25 ? "#d83b01" : "rgb(var(--muted-foreground))" }}>
              {days > 25 && "⚠ "}{days} ημέρες ανοιχτό · {new Date(r.createdAt).toLocaleDateString("el-GR")}
            </p>
          </div>
        </div>

        {r.description && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "rgb(var(--muted-foreground))" }}>Περιγραφή</p>
            <p className="text-[13px] leading-relaxed">{r.description}</p>
          </div>
        )}

        {/* Update form */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgb(var(--muted-foreground))" }}>Κατάσταση</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-sm text-[13px] px-2 py-1.5"
              style={{ border: "1px solid #8a8886", background: "rgb(var(--card))", color: "rgb(var(--foreground))" }}>
              {Object.entries(STATUS_LABELS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgb(var(--muted-foreground))" }}>Ανατέθηκε σε</label>
            <Input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="email υπεύθυνου..." />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgb(var(--muted-foreground))" }}>
            Απάντηση / Ενέργειες που έγιναν
            {status === "COMPLETED" && <span className="ml-2 text-[10px] normal-case" style={{ color: "#107c10" }}>(θα σταλεί email στον/ην {r.subjectEmail})</span>}
          </label>
          <textarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            rows={5}
            className="w-full rounded-sm text-[13px] px-3 py-2 resize-none"
            style={{ border: "1px solid #8a8886", background: "rgb(var(--card))", color: "rgb(var(--foreground))", outline: "none" }}
            placeholder="Περιγράψτε τις ενέργειες που ελήφθησαν και την απάντηση στο υποκείμενο..."
          />
        </div>

        {error && <p className="text-[12px]" style={{ color: "#d83b01" }}>{error}</p>}
        {saved && <p className="text-[12px]" style={{ color: "#107c10" }}>✓ Αποθηκεύτηκε{status === "COMPLETED" ? " — Εστάλη email ολοκλήρωσης" : ""}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-sm px-4 py-1.5 text-[13px] font-semibold"
            style={{ border: "1px solid #8a8886", background: "rgb(var(--card))" }}>
            Κλείσιμο
          </button>
          <button onClick={handleSave} disabled={isPending}
            className="rounded-sm px-4 py-1.5 text-[13px] font-semibold text-white"
            style={{ background: isPending ? "rgba(0,120,212,0.6)" : "rgb(0,120,212)" }}>
            {isPending ? "Αποθήκευση..." : "Αποθήκευση"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
