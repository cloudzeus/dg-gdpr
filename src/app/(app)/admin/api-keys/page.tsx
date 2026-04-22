import { auth } from "@/lib/auth";
import { Topbar } from "@/components/layout/topbar";
import { listApiKeys } from "@/actions/dsr";
import { ApiKeysManager } from "@/components/modules/api-keys-manager";

export default async function ApiKeysPage() {
  const session = await auth();
  const keys = await listApiKeys();
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar userName={session?.user?.name} userRole={(session?.user as any)?.role} pageTitle="API Κλειδιά" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <ApiKeysManager keys={keys.map((k) => ({
            ...k,
            createdAt: k.createdAt.toISOString(),
            updatedAt: k.updatedAt.toISOString(),
            requestCount: (k as any)._count?.requests ?? 0,
          }))} />
        </div>
      </main>
    </div>
  );
}
