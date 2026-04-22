import { auth } from "@/lib/auth";
import { Topbar } from "@/components/layout/topbar";
import { listDsrRequests } from "@/actions/dsr";
import { DsrManager } from "@/components/modules/dsr-manager";

export default async function DsrPage() {
  const session = await auth();
  const requests = await listDsrRequests();
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar userName={session?.user?.name} userRole={(session?.user as any)?.role} pageTitle="Αιτήματα Δικαιωμάτων GDPR" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <DsrManager requests={requests.map((r) => ({
            ...r,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
            completedAt: r.completedAt?.toISOString() ?? null,
            notifiedAt: r.notifiedAt?.toISOString() ?? null,
            apiKeyName: (r as any).apiKey?.name ?? null,
          }))} />
        </div>
      </main>
    </div>
  );
}
