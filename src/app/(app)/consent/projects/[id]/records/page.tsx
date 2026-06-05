import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { auth } from "@/lib/auth";
import { getConsentProjectById, listConsentRecords } from "@/actions/consent";
import { Topbar } from "@/components/layout/topbar";
import { AppFooter } from "@/components/layout/app-footer";
import { Badge } from "@/components/ui/badge";
import { ResendConsentLinkButton } from "@/components/modules/resend-consent-link-button";
import { formatDateTime } from "@/lib/utils";
import { loc } from "@/lib/localized";

const STATUS_META: Record<string, { label: string; variant: "secondary" | "success" | "outline" | "destructive" }> = {
  PENDING: { label: "Εκκρεμεί", variant: "secondary" },
  CONFIRMED: { label: "Επιβεβαιωμένη", variant: "success" },
  WITHDRAWN: { label: "Ανακλήθηκε", variant: "destructive" },
};

export default async function ConsentRecordsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const project = await getConsentProjectById(id);
  if (!project) notFound();
  const records = await listConsentRecords(id);

  const fieldDefs = project.fields.map((f) => ({ key: f.field.key, label: loc(f.field.label, "el") }));
  const purposeDefs = project.purposes.map((p) => ({ id: p.id, label: loc(p.label, "el") }));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        userName={session?.user?.name}
        userRole={(session?.user as { role?: string } | undefined)?.role}
        pageTitle="Συναινέσεις"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Link href={`/consent/projects/${id}`} className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700">
              <ArrowLeft className="h-4 w-4" /> Επιστροφή στο project
            </Link>
            <a
              href={`/api/export/consent/${id}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#0078d4] px-4 py-2 text-sm font-medium text-white hover:bg-[#106ebe]"
            >
              <Download className="h-4 w-4" /> Εξαγωγή Excel
            </a>
          </div>

          <div className="mb-4 flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-neutral-900">Συναινέσεις — {project.name}</h1>
            <Badge variant="outline">{records.length}</Badge>
          </div>

          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Email</th>
                  <th className="px-4 py-2.5 font-medium">Κατάσταση</th>
                  <th className="px-4 py-2.5 font-medium">Επιβεβαίωση</th>
                  <th className="px-4 py-2.5 font-medium">IP</th>
                  <th className="px-4 py-2.5 font-medium">User-Agent</th>
                  <th className="px-4 py-2.5 font-medium">Στοιχεία φόρμας</th>
                  <th className="px-4 py-2.5 font-medium">Ενέργειες</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const meta = STATUS_META[r.status] ?? STATUS_META.PENDING;
                  const values = (r.values ?? {}) as Record<string, unknown>;
                  const pc = (r.purposeConsents ?? {}) as Record<string, boolean>;
                  const consented = purposeDefs.filter((p) => pc[p.id]).map((p) => p.label);
                  return (
                    <tr key={r.id} className="border-t border-neutral-100 hover:bg-neutral-50 align-top">
                      <td className="px-4 py-3 text-neutral-800">{r.subjectEmail}</td>
                      <td className="px-4 py-3"><Badge variant={meta.variant}>{meta.label}</Badge></td>
                      <td className="px-4 py-3 text-neutral-600">{formatDateTime(r.confirmedAt)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-neutral-500">{r.ipAddress ?? "—"}</td>
                      <td className="px-4 py-3 max-w-xs truncate text-xs text-neutral-400">{r.userAgent ?? "—"}</td>
                      <td className="px-4 py-3">
                        <details className="text-xs">
                          <summary className="cursor-pointer select-none text-[#0078d4]">Προβολή</summary>
                          <div className="mt-2 space-y-0.5">
                            {fieldDefs.length === 0 && <div className="text-neutral-400">—</div>}
                            {fieldDefs.map((fd) => (
                              <div key={fd.key}>
                                <span className="text-neutral-500">{fd.label}:</span>{" "}
                                <span className="text-neutral-800">{String(values[fd.key] ?? "—")}</span>
                              </div>
                            ))}
                            <div className="pt-1">
                              <span className="text-neutral-500">Σκοποί:</span>{" "}
                              <span className="text-neutral-800">{consented.length ? consented.join(", ") : "—"}</span>
                            </div>
                          </div>
                        </details>
                      </td>
                      <td className="px-4 py-3">
                        {r.status === "PENDING" ? <ResendConsentLinkButton recordId={r.id} /> : <span className="text-neutral-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
                {records.length === 0 && (
                  <tr><td className="px-4 py-10 text-center text-sm text-neutral-400" colSpan={7}>Καμία συναίνεση ακόμη.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <AppFooter />
        </div>
      </main>
    </div>
  );
}
