import Link from "next/link";
import { auth } from "@/lib/auth";
import { listAllConsentRecords } from "@/actions/consent";
import { Topbar } from "@/components/layout/topbar";
import { AppFooter } from "@/components/layout/app-footer";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

const STATUS_META: Record<string, { label: string; variant: "secondary" | "success" | "outline" | "destructive" }> = {
  PENDING: { label: "Εκκρεμεί", variant: "secondary" },
  CONFIRMED: { label: "Επιβεβαιωμένη", variant: "success" },
  WITHDRAWN: { label: "Ανακλήθηκε", variant: "destructive" },
};

const FILTERS: { key: "" | "PENDING" | "CONFIRMED" | "WITHDRAWN"; label: string; countKey: string }[] = [
  { key: "", label: "Όλες", countKey: "ALL" },
  { key: "PENDING", label: "Εκκρεμείς", countKey: "PENDING" },
  { key: "CONFIRMED", label: "Επιβεβαιωμένες", countKey: "CONFIRMED" },
  { key: "WITHDRAWN", label: "Ανακλήσεις (unsubscribes)", countKey: "WITHDRAWN" },
];

export default async function AllConsentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = sp.status === "PENDING" || sp.status === "CONFIRMED" || sp.status === "WITHDRAWN" ? sp.status : undefined;
  const session = await auth();
  const { records, counts } = await listAllConsentRecords(status);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        userName={session?.user?.name}
        userRole={(session?.user as { role?: string } | undefined)?.role}
        pageTitle="Όλες οι Συναινέσεις"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-4">
            <h1 className="text-2xl font-semibold" style={{ color: "#201F1E" }}>Όλες οι Συναινέσεις</h1>
            <p className="mt-1 text-sm" style={{ color: "#605E5C" }}>
              Συγκεντρωτική προβολή όλων των project. Το φίλτρο «Ανακλήσεις» δείχνει όσους έκαναν unsubscribe.
            </p>
          </div>

          {/* Filter tabs */}
          <div className="mb-4 flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const active = (status ?? "") === f.key;
              const href = f.key ? `/consent/all?status=${f.key}` : "/consent/all";
              return (
                <Link
                  key={f.key || "all"}
                  href={href}
                  className="inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors"
                  style={{
                    borderColor: active ? "#0078D4" : "#EDEBE9",
                    background: active ? "#0078D4" : "#ffffff",
                    color: active ? "#ffffff" : "#201F1E",
                  }}
                >
                  {f.label}
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{
                      background: active ? "rgba(255,255,255,0.22)" : "#F3F2F1",
                      color: active ? "#ffffff" : "#605E5C",
                    }}
                  >
                    {counts[f.countKey] ?? 0}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-lg border bg-white shadow-sm" style={{ borderColor: "#EDEBE9" }}>
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Project</th>
                  <th className="px-4 py-2.5 font-medium">Email</th>
                  <th className="px-4 py-2.5 font-medium">Τηλέφωνο</th>
                  <th className="px-4 py-2.5 font-medium">Κατάσταση</th>
                  <th className="px-4 py-2.5 font-medium">Επιβεβαίωση</th>
                  <th className="px-4 py-2.5 font-medium">Ανάκληση</th>
                  <th className="px-4 py-2.5 font-medium">Δημιουργία</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const meta = STATUS_META[r.status] ?? STATUS_META.PENDING;
                  return (
                    <tr key={r.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <Link href={`/consent/projects/${r.project.id}/records`} className="font-medium text-[#0078D4] hover:underline">
                          {r.project.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-neutral-800">{r.subjectEmail}</td>
                      <td className="px-4 py-3 text-neutral-600">{r.subjectPhone ?? "—"}</td>
                      <td className="px-4 py-3"><Badge variant={meta.variant}>{meta.label}</Badge></td>
                      <td className="px-4 py-3 text-neutral-600">{r.confirmedAt ? formatDateTime(r.confirmedAt) : "—"}</td>
                      <td className="px-4 py-3 text-neutral-600">{r.withdrawnAt ? formatDateTime(r.withdrawnAt) : "—"}</td>
                      <td className="px-4 py-3 text-neutral-500">{formatDateTime(r.createdAt)}</td>
                    </tr>
                  );
                })}
                {records.length === 0 && (
                  <tr><td className="px-4 py-10 text-center text-sm text-neutral-400" colSpan={7}>Καμία εγγραφή για αυτό το φίλτρο.</td></tr>
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
