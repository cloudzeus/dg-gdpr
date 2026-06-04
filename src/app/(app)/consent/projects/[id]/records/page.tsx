import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { auth } from "@/lib/auth";
import { getConsentProjectById, listConsentRecords } from "@/actions/consent";
import { Topbar } from "@/components/layout/topbar";
import { AppFooter } from "@/components/layout/app-footer";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

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
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const meta = STATUS_META[r.status] ?? STATUS_META.PENDING;
                  return (
                    <tr key={r.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                      <td className="px-4 py-3 text-neutral-800">{r.subjectEmail}</td>
                      <td className="px-4 py-3"><Badge variant={meta.variant}>{meta.label}</Badge></td>
                      <td className="px-4 py-3 text-neutral-600">{formatDateTime(r.confirmedAt)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-neutral-500">{r.ipAddress ?? "—"}</td>
                      <td className="px-4 py-3 max-w-xs truncate text-xs text-neutral-400">{r.userAgent ?? "—"}</td>
                    </tr>
                  );
                })}
                {records.length === 0 && (
                  <tr><td className="px-4 py-10 text-center text-sm text-neutral-400" colSpan={5}>Καμία συναίνεση ακόμη.</td></tr>
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
