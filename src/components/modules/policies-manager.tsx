"use client";

import { useState, useTransition, useMemo, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { CommandBar, CommandBarButton, CommandBarSeparator } from "@/components/shared/command-bar";
import { createPolicy, updatePolicy, deletePolicy, getPolicyVersions } from "@/actions/policies";
import {
  MdAdd, MdEdit, MdDelete, MdSearch, MdDescription, MdOpenInNew,
  MdAutoAwesome, MdHistory, MdArrowBack, MdWarning, MdSave, MdClose,
  MdFilterList,
} from "react-icons/md";
import { format } from "date-fns";
import { el } from "date-fns/locale";

type Policy = {
  id: string;
  title: string;
  type: string;
  version: string;
  content: string | null;
  fileUrl: string | null;
  status: string;
  effectiveDate: string | null;
  reviewDate: string | null;
  ownerName: string | null;
  versionCount: number;
};

type PolicyVersion = {
  id: string;
  version: string;
  changedBy: string | null;
  changeNote: string | null;
  createdAt: string;
  content: string | null;
};

const TYPES = [
  { value: "SECURITY_POLICY", label: "Ασφάλεια Πληροφοριών" },
  { value: "ACCEPTABLE_USE", label: "Αποδεκτή Χρήση" },
  { value: "DATA_RETENTION", label: "Διατήρηση Δεδομένων" },
  { value: "INCIDENT_RESPONSE", label: "Incident Response" },
  { value: "BYOD", label: "BYOD" },
  { value: "PASSWORD_POLICY", label: "Κωδικοί" },
  { value: "BACKUP", label: "Backup" },
  { value: "ACCESS_CONTROL", label: "Έλεγχος Πρόσβασης" },
  { value: "PRIVACY_NOTICE", label: "Privacy Notice" },
  { value: "COOKIE_POLICY", label: "Cookies" },
  { value: "DATA_BREACH", label: "Data Breach" },
  { value: "EMPLOYEE_HANDBOOK", label: "Employee Handbook" },
  { value: "ETHICS_CODE", label: "Ethics Code" },
  { value: "CLEAR_DESK", label: "Clear Desk" },
  { value: "REMOTE_WORK", label: "Τηλεργασία" },
  { value: "VENDOR_MANAGEMENT", label: "Διαχ. Προμηθευτών" },
  { value: "CHANGE_MANAGEMENT", label: "Change Mgmt" },
  { value: "BUSINESS_CONTINUITY", label: "BCP" },
  { value: "OTHER", label: "Άλλο" },
];

const STATUSES = [
  { value: "DRAFT", label: "Πρόχειρο", variant: "secondary" as const },
  { value: "UNDER_REVIEW", label: "Υπό Αναθεώρηση", variant: "warning" as const },
  { value: "ACTIVE", label: "Ενεργό", variant: "success" as const },
  { value: "ARCHIVED", label: "Αρχειοθετημένο", variant: "secondary" as const },
];

function reviewDaysLeft(reviewDate: string | null): number | null {
  if (!reviewDate) return null;
  return Math.ceil((new Date(reviewDate).getTime() - Date.now()) / 86400000);
}

export function PoliciesManager({ policies }: { policies: Policy[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [editing, setEditing] = useState<Policy | null>(null);
  const [creating, setCreating] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return policies.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (!q) return true;
      return p.title.toLowerCase().includes(q);
    });
  }, [policies, query, statusFilter]);

  const openCreate = () => { setCreating(true); setEditing(null); setError(null); };
  const openEdit = (p: Policy) => { setEditing(p); setCreating(false); setError(null); };
  const closeModal = () => { setCreating(false); setEditing(null); setError(null); };

  const handleSave = async (id: string | null, data: Parameters<typeof createPolicy>[0]) => {
    setError(null);
    startTransition(async () => {
      try {
        if (id) await updatePolicy(id, data);
        else await createPolicy(data);
        closeModal();
      } catch (e: any) {
        setError(e.message ?? "Σφάλμα");
      }
    });
  };

  const handleDelete = (p: Policy) => {
    if (!confirm(`Διαγραφή πολιτικής «${p.title}»;\nΘα διαγραφεί και το ιστορικό εκδόσεων.`)) return;
    setError(null);
    startTransition(async () => {
      try { await deletePolicy(p.id); } catch (e: any) { setError(e.message ?? "Σφάλμα"); }
    });
  };

  return (
    <div className="space-y-4">
      {/* Command bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <CommandBar>
          <CommandBarButton icon={MdAdd} label="Νέα Πολιτική" variant="primary" onClick={openCreate} />
          <CommandBarSeparator />
          <div className="flex items-center gap-1.5 px-2">
            <MdFilterList size={14} style={{ color: "rgb(var(--muted-foreground))" }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-transparent outline-none py-1"
              style={{ color: "rgb(var(--foreground))" }}
            >
              <option value="ALL">Όλες οι καταστάσεις</option>
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <CommandBarSeparator />
          <div className="flex items-center gap-1.5 px-2">
            <MdSearch size={14} style={{ color: "rgb(var(--muted-foreground))" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Αναζήτηση..."
              className="w-44 bg-transparent text-xs outline-none"
              style={{ color: "rgb(var(--foreground))" }}
            />
          </div>
        </CommandBar>
        <span className="text-xs" style={{ color: "rgb(var(--muted-foreground))" }}>
          {filtered.length} / {policies.length} πολιτικές
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-sm px-3 py-2 text-[12px]"
          style={{ background: "rgba(216,59,1,0.06)", border: "1px solid rgba(216,59,1,0.2)", color: "#d83b01" }}>
          <MdWarning size={14} /> {error}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgb(var(--border))", background: "rgba(0,0,0,0.02)" }}>
                {["Τίτλος", "Τύπος", "Έκδοση", "Κατάσταση", "Αναθεώρηση", "Εκδόσεις", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: "rgb(var(--muted-foreground))" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[13px]" style={{ color: "rgb(var(--muted-foreground))" }}>
                  Δεν βρέθηκαν πολιτικές
                </td></tr>
              )}
              {filtered.map((p) => {
                const days = reviewDaysLeft(p.reviewDate);
                const overdue = days !== null && days < 0;
                const duesSoon = days !== null && days >= 0 && days <= 30;
                const status = STATUSES.find((s) => s.value === p.status);
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid rgb(var(--border))" }}
                    className="hover:bg-[rgba(0,120,212,0.03)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <MdDescription size={15} style={{ color: "rgb(0,120,212)", flexShrink: 0 }} />
                        <span className="font-medium text-[13px]" style={{ color: "rgb(var(--foreground))" }}>{p.title}</span>
                        {p.fileUrl && (
                          <a href={p.fileUrl} target="_blank" rel="noreferrer">
                            <MdOpenInNew size={12} style={{ color: "rgb(0,120,212)" }} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: "rgb(var(--muted-foreground))" }}>
                      {TYPES.find((t) => t.value === p.type)?.label ?? p.type}
                    </td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: "rgb(var(--muted-foreground))" }}>
                      v{p.version}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={status?.variant ?? "secondary"}>{status?.label ?? p.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[12px]">
                      {p.reviewDate ? (
                        <span style={{ color: overdue ? "#d83b01" : duesSoon ? "#ca5010" : "rgb(var(--muted-foreground))" }}>
                          {overdue && "⚠ "}{format(new Date(p.reviewDate), "dd/MM/yyyy")}
                          {overdue && " (εκπρόθεσμο)"}
                          {duesSoon && !overdue && ` (${days}η)`}
                        </span>
                      ) : <span style={{ color: "rgb(var(--muted-foreground))" }}>—</span>}
                    </td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: "rgb(var(--muted-foreground))" }}>
                      {p.versionCount > 0 ? (
                        <span className="flex items-center gap-1">
                          <MdHistory size={13} /> {p.versionCount}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(p)} title="Επεξεργασία"
                          className="flex items-center justify-center rounded-sm transition-colors"
                          style={{ width: 28, height: 28 }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.06)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                          <MdEdit size={15} style={{ color: "rgb(var(--muted-foreground))" }} />
                        </button>
                        <button onClick={() => handleDelete(p)} title="Διαγραφή"
                          className="flex items-center justify-center rounded-sm transition-colors"
                          style={{ width: 28, height: 28 }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(216,59,1,0.08)"; (e.currentTarget.firstChild as SVGElement).style.color = "#d83b01"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; (e.currentTarget.firstChild as SVGElement).style.color = "rgb(var(--muted-foreground))"; }}>
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

      {(creating || editing !== null) && (
        <PolicyModal
          policy={editing}
          onClose={closeModal}
          onSave={handleSave}
          isPending={isPending}
          error={error}
        />
      )}
    </div>
  );
}

// ─── Policy edit/create modal ────────────────────────────────────────────────

function PolicyModal({
  policy, onClose, onSave, isPending, error,
}: {
  policy: Policy | null;
  onClose: () => void;
  onSave: (id: string | null, data: any) => Promise<void>;
  isPending: boolean;
  error: string | null;
}) {
  const [tab, setTab] = useState<"edit" | "history">("edit");
  const [title, setTitle] = useState(policy?.title ?? "");
  const [type, setType] = useState(policy?.type ?? "SECURITY_POLICY");
  const [version, setVersion] = useState(policy?.version ?? "1.0");
  const [status, setStatus] = useState(policy?.status ?? "DRAFT");
  const [effectiveDate, setEffectiveDate] = useState(policy?.effectiveDate?.slice(0, 10) ?? "");
  const [reviewDate, setReviewDate] = useState(policy?.reviewDate?.slice(0, 10) ?? "");
  const [fileUrl, setFileUrl] = useState(policy?.fileUrl ?? "");
  const [changeNote, setChangeNote] = useState("");
  const [content, setContent] = useState(policy?.content ?? "");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [versions, setVersions] = useState<PolicyVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<PolicyVersion | null>(null);

  const loadVersions = useCallback(async () => {
    if (!policy?.id) return;
    setVersionsLoading(true);
    try {
      const vv = await getPolicyVersions(policy.id);
      setVersions(vv.map((v) => ({ ...v, createdAt: new Date(v.createdAt as any).toISOString() })));
    } finally {
      setVersionsLoading(false);
    }
  }, [policy?.id]);

  const handleTabHistory = () => {
    setTab("history");
    if (versions.length === 0) loadVersions();
  };

  const handleGenerate = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/policy-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyType: type, policyTitle: title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Σφάλμα δημιουργίας");
      setContent(data.html);
    } catch (e: any) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(policy?.id ?? null, { title, type, version, status, effectiveDate, reviewDate, fileUrl, content, changeNote });
  };

  const restoreVersion = (v: PolicyVersion) => {
    if (!confirm(`Επαναφορά έκδοσης ${v.version} (${new Date(v.createdAt).toLocaleDateString("el-GR")})?`)) return;
    setContent(v.content ?? "");
    setVersion(v.version);
    setTab("edit");
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={policy ? `Επεξεργασία: ${policy.title}` : "Νέα Πολιτική"}
      size="xl"
    >
      <div>
        {/* Tabs */}
        <div className="flex gap-0 mb-4" style={{ borderBottom: "1px solid rgb(var(--border))" }}>
          {[
            { key: "edit", label: "Επεξεργασία" },
            { key: "history", label: policy ? `Ιστορικό (${policy.versionCount})` : "Ιστορικό", disabled: !policy },
          ].map(({ key, label, disabled }) => (
            <button
              key={key}
              onClick={() => key === "history" ? handleTabHistory() : setTab("edit")}
              disabled={disabled}
              className="px-4 py-2 text-[13px] font-medium transition-colors"
              style={{
                borderBottom: tab === key ? "2px solid rgb(0,120,212)" : "2px solid transparent",
                color: tab === key ? "rgb(0,120,212)" : "rgb(var(--muted-foreground))",
                marginBottom: -1,
                opacity: disabled ? 0.4 : 1,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Edit tab */}
        {tab === "edit" && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-[2fr_1fr] gap-3">
              <Field label="Τίτλος *">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
              </Field>
              <Field label="Τύπος *">
                <select value={type} onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-sm text-[13px] px-2 py-1.5"
                  style={{ border: "1px solid #8a8886", background: "rgb(var(--card))", color: "rgb(var(--foreground))" }}>
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="Κατάσταση">
                <select value={status} onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-sm text-[13px] px-2 py-1.5"
                  style={{ border: "1px solid #8a8886", background: "rgb(var(--card))", color: "rgb(var(--foreground))" }}>
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Έκδοση">
                <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0" />
              </Field>
              <Field label="Ημ. Ισχύος">
                <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
              </Field>
              <Field label="Ημ. Αναθεώρησης">
                <Input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="URL Αρχείου (προαιρετικό)">
                <Input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://..." />
              </Field>
              {policy && (
                <Field label="Σημείωση αλλαγής (για ιστορικό)">
                  <Input value={changeNote} onChange={(e) => setChangeNote(e.target.value)} placeholder="π.χ. Ενημέρωση σκοπού, νέο GDPR άρθρο..." />
                </Field>
              )}
            </div>

            {/* AI generate strip */}
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgb(var(--muted-foreground))" }}>
                Περιεχόμενο Πολιτικής
              </label>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={aiLoading}
                className="flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[12px] font-semibold transition-all"
                style={{
                  background: aiLoading ? "rgba(0,120,212,0.06)" : "rgba(0,120,212,0.08)",
                  border: "1px solid rgba(0,120,212,0.3)",
                  color: "rgb(0,120,212)",
                  opacity: aiLoading ? 0.7 : 1,
                }}
                onMouseEnter={(e) => { if (!aiLoading) e.currentTarget.style.background = "rgba(0,120,212,0.16)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,120,212,0.08)"; }}
              >
                <MdAutoAwesome size={14} />
                {aiLoading ? "Δημιουργία με DeepSeek..." : "Δημιουργία με AI"}
              </button>
            </div>

            {aiError && (
              <p className="text-[12px]" style={{ color: "#d83b01" }}>{aiError}</p>
            )}

            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Γράψτε το περιεχόμενο της πολιτικής ή χρησιμοποιήστε το κουμπί «Δημιουργία με AI»..."
              minHeight={340}
            />

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose}
                className="flex items-center gap-1.5 rounded-sm px-4 py-1.5 text-[13px] font-semibold transition-colors"
                style={{ border: "1px solid #8a8886", background: "rgb(var(--card))", color: "rgb(var(--foreground))" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.04)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgb(var(--card))"}>
                <MdClose size={14} /> Ακύρωση
              </button>
              <button type="submit" disabled={isPending}
                className="flex items-center gap-1.5 rounded-sm px-4 py-1.5 text-[13px] font-semibold text-white transition-colors"
                style={{ background: isPending ? "rgba(0,120,212,0.6)" : "rgb(0,120,212)" }}
                onMouseEnter={(e) => { if (!isPending) e.currentTarget.style.background = "rgb(16,110,190)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = isPending ? "rgba(0,120,212,0.6)" : "rgb(0,120,212)"; }}>
                <MdSave size={14} /> {isPending ? "Αποθήκευση..." : "Αποθήκευση"}
              </button>
            </div>
          </form>
        )}

        {/* History tab */}
        {tab === "history" && (
          <div className="space-y-3">
            {versionsLoading && (
              <p className="text-[13px] text-center py-6" style={{ color: "rgb(var(--muted-foreground))" }}>Φόρτωση ιστορικού...</p>
            )}
            {!versionsLoading && versions.length === 0 && (
              <p className="text-[13px] text-center py-6" style={{ color: "rgb(var(--muted-foreground))" }}>
                Δεν υπάρχουν αποθηκευμένες εκδόσεις. Κάθε αποθήκευση δημιουργεί νέα έκδοση.
              </p>
            )}

            {previewVersion && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => setPreviewVersion(null)}
                    className="flex items-center gap-1 text-[12px]" style={{ color: "rgb(0,120,212)" }}>
                    <MdArrowBack size={14} /> Πίσω στο ιστορικό
                  </button>
                  <span className="text-[12px]" style={{ color: "rgb(var(--muted-foreground))" }}>
                    — Έκδοση {previewVersion.version} · {new Date(previewVersion.createdAt).toLocaleString("el-GR")}
                  </span>
                </div>
                <div
                  className="rounded-sm p-4 overflow-auto prose-editor text-[13px] leading-relaxed"
                  style={{ border: "1px solid rgb(var(--border))", background: "rgb(var(--card))", maxHeight: 400, color: "rgb(var(--foreground))" }}
                  dangerouslySetInnerHTML={{ __html: previewVersion.content ?? "<em>Χωρίς περιεχόμενο</em>" }}
                />
                <button onClick={() => restoreVersion(previewVersion)}
                  className="flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[12px] font-semibold"
                  style={{ background: "rgba(0,120,212,0.08)", border: "1px solid rgba(0,120,212,0.3)", color: "rgb(0,120,212)" }}>
                  Επαναφορά αυτής της έκδοσης
                </button>
              </div>
            )}

            {!previewVersion && versions.map((v) => (
              <div key={v.id} className="flex items-start justify-between gap-3 rounded-sm p-3"
                style={{ border: "1px solid rgb(var(--border))", background: "rgb(var(--card))" }}>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold" style={{ color: "rgb(var(--foreground))" }}>
                      v{v.version}
                    </span>
                    <span className="text-[11px]" style={{ color: "rgb(var(--muted-foreground))" }}>
                      {new Date(v.createdAt).toLocaleString("el-GR")}
                    </span>
                  </div>
                  {v.changeNote && (
                    <p className="text-[12px]" style={{ color: "rgb(var(--muted-foreground))" }}>{v.changeNote}</p>
                  )}
                </div>
                <button onClick={() => setPreviewVersion(v)}
                  className="shrink-0 flex items-center gap-1 rounded-sm px-2.5 py-1 text-[11px] font-semibold"
                  style={{ border: "1px solid rgba(0,120,212,0.25)", color: "rgb(0,120,212)", background: "rgba(0,120,212,0.05)" }}>
                  <MdHistory size={12} /> Προβολή
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgb(var(--muted-foreground))" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
