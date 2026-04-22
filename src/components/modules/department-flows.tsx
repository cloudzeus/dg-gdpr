"use client";

import { useState, useTransition } from "react";
import type { DepartmentFlowData, DataEntry, RiskLevel } from "@/actions/dataflows";
import { saveDepartmentEntries } from "@/actions/dataflows";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  MdGroup, MdTrendingUp, MdComputer, MdHeadsetMic, MdAccountBalance,
  MdCampaign, MdCorporateFare, MdBusiness, MdEdit, MdAdd, MdDelete,
  MdSave, MdClose, MdArrowForward, MdWarning, MdPublic, MdLock,
  MdTableChart, MdAccountTree, MdChevronRight, MdExpandMore, MdExpandLess,
  MdCheckCircle, MdInfo,
} from "react-icons/md";

/* ─── Types & constants ─────────────────────────────────────────── */

const RISK: Record<RiskLevel, { label: string; color: string; bg: string; border: string }> = {
  LOW:      { label: "Χαμηλός",  color: "#107c10", bg: "rgba(16,124,16,0.08)",    border: "#107c10" },
  MEDIUM:   { label: "Μέτριος",  color: "#ca5d00", bg: "rgba(202,93,0,0.08)",     border: "#ca5d00" },
  HIGH:     { label: "Υψηλός",   color: "#d13438", bg: "rgba(209,52,56,0.08)",    border: "#d13438" },
  CRITICAL: { label: "Κρίσιμος", color: "#a4262c", bg: "rgba(164,38,44,0.1)",    border: "#a4262c" },
};

const LEGAL_BASIS_OPTIONS = [
  "Συγκατάθεση (Άρθ. 6(1)(α))",
  "Σύμβαση (Άρθ. 6(1)(β))",
  "Νομική υποχρέωση (Άρθ. 6(1)(γ))",
  "Ζωτικά συμφέροντα (Άρθ. 6(1)(δ))",
  "Δημόσιο συμφέρον (Άρθ. 6(1)(ε))",
  "Έννομο συμφέρον (Άρθ. 6(1)(στ))",
  "Σύμβαση εργασίας (Άρθ. 6(1)(β))",
];

/* Pick a flat icon based on department name keywords */
function getDeptIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("ανθρώπιν") || n.includes("hr") || n.includes("δυναμικ")) return MdGroup;
  if (n.includes("πωλ") || n.includes("crm") || n.includes("sales")) return MdTrendingUp;
  if (n.includes("τεχν") || n.includes("ανάπτυξ") || n.includes("it") || n.includes("dev")) return MdComputer;
  if (n.includes("voip") || n.includes("υποστήρ") || n.includes("τηλ")) return MdHeadsetMic;
  if (n.includes("λογιστ") || n.includes("οικον") || n.includes("finance")) return MdAccountBalance;
  if (n.includes("market") || n.includes("επικοιν")) return MdCampaign;
  if (n.includes("διοίκ") || n.includes("διαχείρ")) return MdCorporateFare;
  return MdBusiness;
}

function newEntry(): DataEntry {
  return {
    id: `entry-${Date.now()}`,
    category: "",
    dataTypes: [],
    legalBasis: LEGAL_BASIS_OPTIONS[1],
    retention: "5 χρόνια",
    destinations: [],
    riskLevel: "MEDIUM",
    externalTransfer: false,
    notes: "",
  };
}

/* ─── Risk badge ─────────────────────────────────────────────────── */
function RiskBadge({ level }: { level: RiskLevel }) {
  const r = RISK[level];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: r.bg, color: r.color, border: `1px solid ${r.color}40` }}
    >
      {(level === "HIGH" || level === "CRITICAL") && <MdWarning size={11} />}
      {r.label}
    </span>
  );
}

/* ─── Flow row (read view) ───────────────────────────────────────── */
function FlowRow({ entry }: { entry: DataEntry }) {
  const r = RISK[entry.riskLevel];
  return (
    <div
      className="flex items-stretch gap-0 rounded-sm overflow-hidden"
      style={{ border: "1px solid rgb(var(--border))" }}
    >
      {/* Risk color stripe */}
      <div className="w-1 shrink-0" style={{ background: r.border }} />

      <div className="flex-1 p-3 grid grid-cols-[200px_1fr_auto] gap-4 items-start min-w-0">
        {/* Column 1: Category */}
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-foreground truncate">{entry.category || "—"}</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {entry.dataTypes.slice(0, 4).map((t) => (
              <span
                key={t}
                className="text-[10px] px-1.5 py-0.5 rounded-sm"
                style={{
                  background: "rgba(0,120,212,0.08)",
                  color: "rgb(0,90,158)",
                  border: "1px solid rgba(0,120,212,0.2)",
                }}
              >
                {t}
              </span>
            ))}
            {entry.dataTypes.length > 4 && (
              <span className="text-[10px] text-muted-foreground">+{entry.dataTypes.length - 4}</span>
            )}
          </div>
          <div className="mt-2">
            <RiskBadge level={entry.riskLevel} />
          </div>
        </div>

        {/* Column 2: Flow visualization */}
        <div className="min-w-0">
          {/* Legal basis */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[11px] px-2 py-0.5 rounded-sm font-medium"
              style={{ background: "rgb(var(--secondary))", color: "rgb(var(--muted-foreground))", border: "1px solid rgb(var(--border))" }}
            >
              {entry.legalBasis.split("(")[0].trim()}
            </span>

            {entry.destinations.length > 0 && (
              <>
                <MdArrowForward size={14} style={{ color: "rgb(var(--muted-foreground))", flexShrink: 0 }} />
                <div className="flex flex-wrap gap-1">
                  {entry.destinations.map((d) => (
                    <span
                      key={d}
                      className="text-[11px] px-2 py-0.5 rounded-sm font-medium"
                      style={{
                        background: "rgb(var(--card))",
                        color: "rgb(var(--foreground))",
                        border: "1px solid rgb(var(--border))",
                      }}
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Notes */}
          {entry.notes && (
            <p className="text-[11px] text-muted-foreground mt-1.5 italic flex items-start gap-1">
              <MdInfo size={12} style={{ flexShrink: 0, marginTop: 1 }} />
              {entry.notes}
            </p>
          )}
        </div>

        {/* Column 3: Metadata */}
        <div className="text-right shrink-0 space-y-1">
          <div className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
            <MdLock size={12} />
            <span>{entry.retention}</span>
          </div>
          {entry.externalTransfer && (
            <div
              className="flex items-center justify-end gap-1 text-[11px] font-semibold"
              style={{ color: "#ca5d00" }}
            >
              <MdPublic size={12} />
              <span>Εκτός ΕΕ</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Entry edit form ───────────────────────────────────────────── */
function EntryForm({
  entry, onChange, onDelete,
}: {
  entry: DataEntry;
  onChange: (e: DataEntry) => void;
  onDelete: () => void;
}) {
  const [dataTypesRaw, setDataTypesRaw] = useState(entry.dataTypes.join(", "));
  const [destinationsRaw, setDestinationsRaw] = useState(entry.destinations.join(", "));
  const update = (patch: Partial<DataEntry>) => onChange({ ...entry, ...patch });

  return (
    <div
      className="rounded-sm p-4 space-y-3"
      style={{ border: "1px solid rgb(0,120,212)", background: "rgba(0,120,212,0.02)" }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-[12px] font-semibold" style={{ color: "rgb(var(--foreground))" }}>
            Κατηγορία Δεδομένων *
          </label>
          <Input
            value={entry.category}
            onChange={(e) => update({ category: e.target.value })}
            placeholder="π.χ. Στοιχεία Εργαζομένων"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[12px] font-semibold" style={{ color: "rgb(var(--foreground))" }}>
            Νομική Βάση *
          </label>
          <Select value={entry.legalBasis} onChange={(e) => update({ legalBasis: e.target.value })}>
            {LEGAL_BASIS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-[12px] font-semibold" style={{ color: "rgb(var(--foreground))" }}>
            Τύποι Δεδομένων
            <span className="font-normal text-muted-foreground ml-1">(χωρισμένα με κόμμα)</span>
          </label>
          <Input
            value={dataTypesRaw}
            onChange={(e) => {
              setDataTypesRaw(e.target.value);
              update({ dataTypes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) });
            }}
            placeholder="Ονοματεπώνυμο, Email, ΑΦΜ, ..."
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[12px] font-semibold" style={{ color: "rgb(var(--foreground))" }}>
            Αποδέκτες / Συστήματα
            <span className="font-normal text-muted-foreground ml-1">(χωρισμένα με κόμμα)</span>
          </label>
          <Input
            value={destinationsRaw}
            onChange={(e) => {
              setDestinationsRaw(e.target.value);
              update({ destinations: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) });
            }}
            placeholder="SoftOne ERP, CRM, ΕΦΚΑ, ..."
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="block text-[12px] font-semibold" style={{ color: "rgb(var(--foreground))" }}>
            Διατήρηση Δεδομένων
          </label>
          <Input
            value={entry.retention}
            onChange={(e) => update({ retention: e.target.value })}
            placeholder="π.χ. 5 χρόνια"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[12px] font-semibold" style={{ color: "rgb(var(--foreground))" }}>
            Επίπεδο Κινδύνου
          </label>
          <Select value={entry.riskLevel} onChange={(e) => update({ riskLevel: e.target.value as RiskLevel })}>
            <option value="LOW">Χαμηλός</option>
            <option value="MEDIUM">Μέτριος</option>
            <option value="HIGH">Υψηλός</option>
            <option value="CRITICAL">Κρίσιμος</option>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="block text-[12px] font-semibold" style={{ color: "rgb(var(--foreground))" }}>
            Διαβίβαση εκτός ΕΕ;
          </label>
          <Select
            value={entry.externalTransfer ? "yes" : "no"}
            onChange={(e) => update({ externalTransfer: e.target.value === "yes" })}
          >
            <option value="no">Όχι</option>
            <option value="yes">Ναι (απαιτεί SCCs / BCRs)</option>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-[12px] font-semibold" style={{ color: "rgb(var(--foreground))" }}>
          Σημειώσεις
          <span className="font-normal text-muted-foreground ml-1">(προαιρετικά)</span>
        </label>
        <textarea
          value={entry.notes ?? ""}
          onChange={(e) => update({ notes: e.target.value })}
          rows={2}
          placeholder="π.χ. Υποχρεωτική ειδοποίηση υποκειμένου πριν εγγραφή"
          className="w-full rounded-sm px-3 py-2 text-sm resize-none focus:outline-none"
          style={{
            border: "1px solid #8a8886",
            background: "rgb(var(--card))",
            color: "rgb(var(--foreground))",
          }}
        />
      </div>

      <button
        type="button"
        onClick={onDelete}
        className="flex items-center gap-1.5 text-[12px] font-semibold transition-colors"
        style={{ color: "#a4262c" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.7")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
      >
        <MdDelete size={14} />
        Διαγραφή κατηγορίας
      </button>
    </div>
  );
}

/* ─── Department card ───────────────────────────────────────────── */
function DepartmentCard({ dept }: { dept: DepartmentFlowData }) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [entries, setEntries] = useState<DataEntry[]>(dept.entries);
  const [isPending, startTransition] = useTransition();

  const DeptIcon = getDeptIcon(dept.department);
  const highRisk = entries.filter((e) => e.riskLevel === "HIGH" || e.riskLevel === "CRITICAL").length;
  const externalCount = entries.filter((e) => e.externalTransfer).length;
  const maxRisk: RiskLevel = entries.some((e) => e.riskLevel === "CRITICAL")
    ? "CRITICAL"
    : entries.some((e) => e.riskLevel === "HIGH")
    ? "HIGH"
    : entries.some((e) => e.riskLevel === "MEDIUM")
    ? "MEDIUM"
    : "LOW";

  const handleSave = () => {
    startTransition(async () => {
      await saveDepartmentEntries(dept.id, entries);
      setEditing(false);
    });
  };

  return (
    <div
      className="rounded-sm bg-card overflow-hidden"
      style={{
        border: "1px solid rgb(var(--border))",
        boxShadow: "0 1.6px 3.6px 0 rgba(0,0,0,.08), 0 0.3px 0.9px 0 rgba(0,0,0,.06)",
      }}
    >
      {/* Department header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        style={{ borderBottom: expanded ? "1px solid rgb(var(--border))" : undefined }}
        onClick={() => !editing && setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          {/* Expand/collapse chevron */}
          {expanded
            ? <MdExpandLess size={18} style={{ color: "rgb(var(--muted-foreground))" }} />
            : <MdExpandMore size={18} style={{ color: "rgb(var(--muted-foreground))" }} />
          }
          {/* Dept icon */}
          <div
            className="flex h-8 w-8 items-center justify-center rounded-sm"
            style={{ background: "rgba(0,120,212,0.08)" }}
          >
            <DeptIcon size={18} style={{ color: "rgb(0,120,212)" }} />
          </div>
          <div>
            <p className="text-[14px] font-semibold" style={{ color: "rgb(var(--foreground))" }}>
              {dept.department}
            </p>
            <p className="text-[11px]" style={{ color: "rgb(var(--muted-foreground))" }}>
              {entries.length} κατηγορί{entries.length !== 1 ? "ες" : "α"} επεξεργασίας
              {externalCount > 0 && ` · ${externalCount} ροές εκτός ΕΕ`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {entries.length > 0 && highRisk > 0 && (
            <span
              className="text-[11px] font-semibold flex items-center gap-1"
              style={{ color: RISK[maxRisk].color }}
            >
              <MdWarning size={13} /> {highRisk} υψηλού κινδύνου
            </span>
          )}
          {!editing ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setExpanded(true); setEditing(true); }}
              className="flex items-center gap-1.5 text-[12px]"
            >
              <MdEdit size={13} /> Επεξεργασία
            </Button>
          ) : (
            <div className="flex items-center gap-1.5">
              <Button size="sm" onClick={handleSave} disabled={isPending} className="flex items-center gap-1.5 text-[12px]">
                <MdSave size={13} /> {isPending ? "Αποθήκευση..." : "Αποθήκευση"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEntries(dept.entries); setEditing(false); }} className="flex items-center gap-1.5 text-[12px]">
                <MdClose size={13} /> Ακύρωση
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="p-4 space-y-2">
          {!editing ? (
            /* ── Read view ── */
            entries.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-8 rounded-sm text-center"
                style={{ background: "rgb(var(--secondary))", border: "1px dashed rgb(var(--border))" }}
              >
                <MdInfo size={24} style={{ color: "rgb(var(--muted-foreground))", marginBottom: 8 }} />
                <p className="text-[13px] font-semibold" style={{ color: "rgb(var(--foreground))" }}>
                  Δεν υπάρχουν καταχωρημένες επεξεργασίες
                </p>
                <p className="text-[12px] mt-1" style={{ color: "rgb(var(--muted-foreground))" }}>
                  Πατήστε «Επεξεργασία» για να καταχωρήσετε τα δεδομένα που επεξεργάζεται αυτό το τμήμα.
                </p>
              </div>
            ) : (
              /* Column headers */
              <div className="space-y-2">
                <div className="grid grid-cols-[200px_1fr_auto] gap-4 px-3 pb-1" style={{ borderBottom: "1px solid rgb(var(--border))" }}>
                  {["Κατηγορία Δεδομένων", "Ροή: Νομική Βάση → Αποδέκτες", "Διατήρηση"].map((h) => (
                    <p key={h} className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "rgb(var(--muted-foreground))" }}>
                      {h}
                    </p>
                  ))}
                </div>
                {entries.map((entry) => <FlowRow key={entry.id} entry={entry} />)}
              </div>
            )
          ) : (
            /* ── Edit view ── */
            <div className="space-y-3">
              {entries.map((entry, idx) => (
                <EntryForm
                  key={entry.id}
                  entry={entry}
                  onChange={(updated) => setEntries((prev) => prev.map((e, i) => i === idx ? updated : e))}
                  onDelete={() => setEntries((prev) => prev.filter((_, i) => i !== idx))}
                />
              ))}
              <button
                type="button"
                onClick={() => setEntries((prev) => [...prev, newEntry()])}
                className="w-full flex items-center justify-center gap-2 rounded-sm py-2.5 text-[13px] font-semibold transition-colors"
                style={{
                  border: "1px dashed rgba(0,120,212,0.5)",
                  color: "rgb(0,120,212)",
                  background: "rgba(0,120,212,0.03)",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(0,120,212,0.07)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(0,120,212,0.03)")}
              >
                <MdAdd size={16} /> Προσθήκη Κατηγορίας Επεξεργασίας
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── RoPA Table view ───────────────────────────────────────────── */
function RopaTable({ departments }: { departments: DepartmentFlowData[] }) {
  const allRows = departments.flatMap((d) =>
    d.entries.map((e) => ({ ...e, deptName: d.department }))
  );

  const cols = ["Τμήμα", "Κατηγορία", "Τύποι Δεδομένων", "Νομική Βάση", "Διατήρηση", "Αποδέκτες", "Κίνδυνος", "Εκτός ΕΕ"];

  if (allRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16" style={{ color: "rgb(var(--muted-foreground))" }}>
        <MdTableChart size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
        <p className="text-[14px] font-semibold">Δεν υπάρχουν εγγραφές RoPA</p>
        <p className="text-[12px] mt-1">Προσθέστε κατηγορίες επεξεργασίας στα τμήματα για να εμφανιστεί ο πίνακας.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-sm" style={{ border: "1px solid rgb(var(--border))" }}>
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr style={{ background: "rgb(var(--secondary))", borderBottom: "1px solid rgb(var(--border))" }}>
            {cols.map((c) => (
              <th key={c} className="text-left px-3 py-2.5 font-semibold whitespace-nowrap" style={{ color: "rgb(var(--foreground))" }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allRows.map((row, i) => (
            <tr
              key={row.id}
              style={{ borderBottom: "1px solid rgb(var(--border))", background: i % 2 === 0 ? "rgb(var(--card))" : "rgba(0,0,0,0.012)" }}
            >
              <td className="px-3 py-2 font-medium whitespace-nowrap" style={{ color: "rgb(var(--foreground))" }}>{row.deptName}</td>
              <td className="px-3 py-2 font-medium whitespace-nowrap" style={{ color: "rgb(var(--foreground))" }}>{row.category}</td>
              <td className="px-3 py-2" style={{ color: "rgb(var(--muted-foreground))" }}>{row.dataTypes.join(", ") || "—"}</td>
              <td className="px-3 py-2 whitespace-nowrap" style={{ color: "rgb(var(--muted-foreground))" }}>{row.legalBasis.split("(")[0].trim()}</td>
              <td className="px-3 py-2 whitespace-nowrap" style={{ color: "rgb(var(--muted-foreground))" }}>{row.retention}</td>
              <td className="px-3 py-2" style={{ color: "rgb(var(--muted-foreground))" }}>{row.destinations.join(", ") || "—"}</td>
              <td className="px-3 py-2"><RiskBadge level={row.riskLevel} /></td>
              <td className="px-3 py-2 text-center">
                {row.externalTransfer
                  ? <span style={{ color: "#ca5d00" }}><MdPublic size={14} /></span>
                  : <MdCheckCircle size={14} style={{ color: "#107c10" }} />
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Main export ───────────────────────────────────────────────── */
export function DepartmentFlows({ departments }: { departments: DepartmentFlowData[] }) {
  const [view, setView] = useState<"flow" | "table">("flow");

  const allEntries = departments.flatMap((d) => d.entries);
  const totalHigh = allEntries.filter((e) => e.riskLevel === "HIGH" || e.riskLevel === "CRITICAL").length;
  const totalExternal = allEntries.filter((e) => e.externalTransfer).length;

  const stats = [
    { label: "Τμήματα", value: departments.length, color: "rgb(0,120,212)" },
    { label: "Κατηγορίες Επεξεργασίας", value: allEntries.length, color: "rgb(0,120,212)" },
    { label: "Υψηλού Κινδύνου", value: totalHigh, color: totalHigh > 0 ? "#d13438" : "#107c10" },
    { label: "Εξωτερικές Ροές (εκτός ΕΕ)", value: totalExternal, color: totalExternal > 0 ? "#ca5d00" : "#107c10" },
  ];

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-sm p-4 text-center bg-card"
            style={{ border: "1px solid rgb(var(--border))", boxShadow: "0 1px 2px rgba(0,0,0,.06)" }}
          >
            <p className="text-[22px] font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "rgb(var(--muted-foreground))" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* High risk warning */}
      {totalHigh > 0 && (
        <div
          className="flex items-start gap-3 rounded-sm p-3 text-[13px]"
          style={{ background: "rgba(209,52,56,0.06)", border: "1px solid rgba(209,52,56,0.3)", color: "#a4262c" }}
        >
          <MdWarning size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            <strong>{totalHigh} κατηγορίες υψηλού κινδύνου</strong> — απαιτείται DPIA (Εκτίμηση Αντικτύπου) βάσει Άρθρου 35 GDPR.{" "}
            <a href="/dpia" className="underline">Μεταβείτε στο DPIA →</a>
          </span>
        </div>
      )}

      {/* View switcher */}
      <div className="flex items-center gap-0 rounded-sm overflow-hidden self-start" style={{ border: "1px solid rgb(var(--border))" }}>
        {([
          { key: "flow", label: "Επισκόπηση Ροών", icon: MdAccountTree },
          { key: "table", label: "Πίνακας RoPA", icon: MdTableChart },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold transition-colors"
            style={{
              background: view === key ? "rgb(0,120,212)" : "rgb(var(--card))",
              color: view === key ? "#fff" : "rgb(var(--muted-foreground))",
              borderRight: key === "flow" ? "1px solid rgb(var(--border))" : undefined,
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {view === "flow" ? (
        <div className="space-y-3">
          {departments.map((dept) => (
            <DepartmentCard key={dept.id} dept={dept} />
          ))}
        </div>
      ) : (
        <RopaTable departments={departments} />
      )}
    </div>
  );
}
