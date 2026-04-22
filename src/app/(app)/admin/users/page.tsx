import { Topbar } from "@/components/layout/topbar";
import { auth } from "@/lib/auth";
import { listUsers } from "@/actions/users-admin";
import { listDepartments } from "@/actions/departments";
import { listPositions } from "@/actions/positions";
import { UsersManager } from "@/components/modules/users-manager";

export default async function UsersPage() {
  const session = await auth();
  const [users, departments, positions] = await Promise.all([
    listUsers(),
    listDepartments(),
    listPositions(),
  ]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar userName={session?.user?.name} userRole={(session?.user as any)?.role} pageTitle="Χρήστες" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <UsersManager
            currentUserId={session?.user?.id ?? ""}
            users={users.map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              image: u.image,
              role: u.role,
              phone: u.phone,
              isActive: u.isActive,
              departmentId: u.department?.id ?? null,
              departmentName: u.department?.name ?? null,
              positionId: u.position?.id ?? null,
              positionTitle: u.position?.title ?? null,
            }))}
            departments={departments.map((d) => ({ id: d.id, name: d.name }))}
            positions={positions.map((p) => ({ id: p.id, title: p.title }))}
          />
        </div>
      </main>
    </div>
  );
}
