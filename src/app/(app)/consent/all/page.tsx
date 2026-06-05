import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listAllConsentRecords } from "@/actions/consent";
import { loc } from "@/lib/localized";
import { Topbar } from "@/components/layout/topbar";
import { AppFooter } from "@/components/layout/app-footer";
import { ConsentAllTable, type ConsentRow } from "@/components/modules/consent-all-table";

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

  // Label maps (field keys → labels, purpose ids → labels) per project.
  const projects = await prisma.consentProject.findMany({
    select: {
      id: true,
      fields: { select: { field: { select: { key: true, label: true } } }, orderBy: { order: "asc" } },
      purposes: { select: { id: true, label: true }, orderBy: { order: "asc" } },
    },
  });
  const fieldDefsByProject = new Map<string, { key: string; label: string }[]>();
  const purposeDefsByProject = new Map<string, { id: string; label: string }[]>();
  for (const p of projects) {
    fieldDefsByProject.set(p.id, p.fields.map((f) => ({ key: f.field.key, label: loc(f.field.label, "el") })));
    purposeDefsByProject.set(p.id, p.purposes.map((pp) => ({ id: pp.id, label: loc(pp.label, "el") })));
  }

  // Captured-by employee names.
  const capturerIds = [...new Set(records.map((r) => r.capturedById).filter(Boolean) as string[])];
  const capturers = capturerIds.length
    ? await prisma.user.findMany({ where: { id: { in: capturerIds } }, select: { id: true, name: true, email: true } })
    : [];
  const nameById = new Map(capturers.map((u) => [u.id, u.name ?? u.email ?? u.id]));

  const rows: ConsentRow[] = records.map((r) => ({
    id: r.id,
    projectId: r.project.id,
    projectName: r.project.name,
    email: r.subjectEmail,
    phone: r.subjectPhone,
    status: r.status,
    confirmedAt: r.confirmedAt ? r.confirmedAt.toISOString() : null,
    withdrawnAt: r.withdrawnAt ? r.withdrawnAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    ipAddress: r.ipAddress,
    userAgent: r.userAgent,
    confirmationChannel: r.confirmationChannel,
    signatureUrl: r.signatureUrl,
    capturedByName: r.capturedById ? nameById.get(r.capturedById) ?? null : null,
    values: (r.values ?? {}) as Record<string, unknown>,
    purposeConsents: (r.purposeConsents ?? {}) as Record<string, boolean>,
    fieldDefs: fieldDefsByProject.get(r.project.id) ?? [],
    purposeDefs: purposeDefsByProject.get(r.project.id) ?? [],
  }));

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
              Συγκεντρωτική προβολή όλων των project. Κάθε γραμμή ανοίγει με όλα τα στοιχεία και τις αποδείξεις (υπογραφή, IP, κανάλι). Το φίλτρο «Ανακλήσεις» δείχνει όσους έκαναν unsubscribe.
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

          <ConsentAllTable rows={rows} />

          <AppFooter />
        </div>
      </main>
    </div>
  );
}
