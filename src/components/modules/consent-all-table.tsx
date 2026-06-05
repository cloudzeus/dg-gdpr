"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type ColumnDef, type RowAction } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { resendConsentLink, adminWithdrawConsent } from "@/actions/consent";

export interface ConsentRow {
  id: string;
  projectId: string;
  projectName: string;
  email: string;
  phone: string | null;
  status: string;
  confirmedAt: string | null;
  withdrawnAt: string | null;
  createdAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  confirmationChannel: string | null;
  signatureUrl: string | null;
  capturedByName: string | null;
  values: Record<string, unknown>;
  purposeConsents: Record<string, boolean>;
  fieldDefs: { key: string; label: string }[];
  purposeDefs: { id: string; label: string }[];
}

const STATUS_META: Record<string, { label: string; variant: "secondary" | "success" | "outline" | "destructive" }> = {
  PENDING: { label: "Εκκρεμεί", variant: "secondary" },
  CONFIRMED: { label: "Επιβεβαιωμένη", variant: "success" },
  WITHDRAWN: { label: "Ανακλήθηκε", variant: "destructive" },
};

const CHANNEL_LABEL: Record<string, string> = {
  EMAIL: "Email", SMS: "SMS", BOTH: "Email + SMS", IN_PERSON: "Δια ζώσης (υπογραφή)",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground break-words">{value || "—"}</span>
    </div>
  );
}

export function ConsentAllTable({ rows }: { rows: ConsentRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const columns: ColumnDef<ConsentRow>[] = [
    { id: "project", header: "Project", defaultWidth: 200, cell: (r) => <span className="font-medium text-[rgb(0,120,212)]">{r.projectName}</span> },
    { id: "email", header: "Email", defaultWidth: 220, cell: (r) => r.email },
    { id: "phone", header: "Τηλέφωνο", defaultWidth: 130, cell: (r) => r.phone ?? "—" },
    { id: "status", header: "Κατάσταση", defaultWidth: 130, cell: (r) => { const m = STATUS_META[r.status] ?? STATUS_META.PENDING; return <Badge variant={m.variant}>{m.label}</Badge>; } },
    { id: "confirmedAt", header: "Επιβεβαίωση", defaultWidth: 150, cell: (r) => formatDateTime(r.confirmedAt) },
    { id: "withdrawnAt", header: "Ανάκληση", defaultWidth: 150, cell: (r) => formatDateTime(r.withdrawnAt) },
    { id: "createdAt", header: "Δημιουργία", defaultWidth: 150, cell: (r) => formatDateTime(r.createdAt) },
  ];

  function renderExpanded(r: ConsentRow) {
    const consented = r.purposeDefs.filter((p) => r.purposeConsents?.[p.id]);
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {/* Submitted data */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Στοιχεία φόρμας</h4>
          <div className="grid grid-cols-2 gap-3">
            {r.fieldDefs.length === 0 && <span className="text-sm text-muted-foreground">—</span>}
            {r.fieldDefs.map((fd) => (
              <Field key={fd.key} label={fd.label} value={String(r.values?.[fd.key] ?? "—")} />
            ))}
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Σκοποί συναίνεσης</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {consented.length === 0 ? <span className="text-sm text-muted-foreground">—</span> :
                consented.map((p) => <Badge key={p.id} variant="success">{p.label}</Badge>)}
            </div>
          </div>
        </div>

        {/* Proofs */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Αποδείξεις</h4>
          <div className="grid grid-cols-2 gap-3">
            <Field label="IP" value={<span className="font-mono text-xs">{r.ipAddress ?? "—"}</span>} />
            <Field label="Κανάλι" value={r.confirmationChannel ? (CHANNEL_LABEL[r.confirmationChannel] ?? r.confirmationChannel) : "—"} />
            <Field label="Καταχώρηση από" value={r.capturedByName ?? "—"} />
            <Field label="Ημ/νία δημιουργίας" value={formatDateTime(r.createdAt)} />
          </div>
          <Field label="User-Agent" value={<span className="text-xs text-muted-foreground break-all">{r.userAgent ?? "—"}</span>} />
          {r.signatureUrl && (
            <div>
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Υπογραφή</span>
              <div className="mt-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.signatureUrl} alt="Υπογραφή πελάτη" className="max-h-32 rounded-md border border-border bg-white p-2" />
                <a href={r.signatureUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-[rgb(0,120,212)] hover:underline">Άνοιγμα σε νέα καρτέλα</a>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function rowActions(r: ConsentRow): RowAction<ConsentRow>[] {
    const actions: RowAction<ConsentRow>[] = [
      { label: "Άνοιγμα project", onClick: () => router.push(`/consent/projects/${r.projectId}/records`) },
    ];
    if (r.signatureUrl) {
      actions.push({ label: "Άνοιγμα υπογραφής", onClick: () => window.open(r.signatureUrl!, "_blank") });
    }
    if (r.status === "PENDING") {
      actions.push({
        label: isPending ? "Αποστολή…" : "Επαναποστολή link",
        onClick: () => startTransition(async () => { try { await resendConsentLink(r.id); router.refresh(); } catch { /* surfaced elsewhere */ } }),
      });
    }
    if (r.status === "CONFIRMED") {
      actions.push({
        label: "Ανάκληση συναίνεσης",
        destructive: true,
        onClick: () => startTransition(async () => { try { await adminWithdrawConsent(r.id); router.refresh(); } catch { /* */ } }),
      });
    }
    return actions;
  }

  return (
    <DataTable
      data={rows}
      columns={columns}
      getRowId={(r) => r.id}
      pageSize={15}
      renderExpanded={renderExpanded}
      actions={rowActions}
      emptyMessage="Καμία εγγραφή για αυτό το φίλτρο."
    />
  );
}
