import { Topbar } from "@/components/layout/topbar";
import { auth } from "@/lib/auth";
import { listPositions } from "@/actions/positions";
import { PositionsManager } from "@/components/modules/positions-manager";

export default async function PositionsPage() {
  const session = await auth();
  const positions = await listPositions();
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar userName={session?.user?.name} userRole={(session?.user as any)?.role} pageTitle="Θέσεις Εργασίας" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <PositionsManager positions={positions.map((p) => ({
            id: p.id,
            title: p.title,
            code: p.code,
            description: p.description,
            isKeyRole: p.isKeyRole,
            userCount: p._count.users,
          }))} />
        </div>
      </main>
    </div>
  );
}
