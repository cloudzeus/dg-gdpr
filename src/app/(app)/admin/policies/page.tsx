import { Topbar } from "@/components/layout/topbar";
import { auth } from "@/lib/auth";
import { listPolicies } from "@/actions/policies";
import { PoliciesManager } from "@/components/modules/policies-manager";

export default async function PoliciesPage() {
  const session = await auth();
  const policies = await listPolicies();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar userName={session?.user?.name} userRole={(session?.user as any)?.role} pageTitle="Πολιτικές & Έγγραφα" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <PoliciesManager
            policies={policies.map((p) => ({
              id: p.id,
              title: p.title,
              type: p.type,
              version: p.version,
              content: p.content,
              fileUrl: p.fileUrl,
              status: p.status,
              effectiveDate: p.effectiveDate?.toISOString() ?? null,
              reviewDate: p.reviewDate?.toISOString() ?? null,
              ownerName: p.owner?.name ?? p.owner?.email ?? null,
              versionCount: (p as any)._count?.versions ?? 0,
            }))}
          />
        </div>
      </main>
    </div>
  );
}
