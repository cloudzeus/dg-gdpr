import { Topbar } from "@/components/layout/topbar";
import { auth } from "@/lib/auth";
import { listDepartments } from "@/actions/departments";
import { prisma } from "@/lib/prisma";
import { DepartmentsManager } from "@/components/modules/departments-manager";

export default async function DepartmentsPage() {
  const session = await auth();
  const departments = await listDepartments();
  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar userName={session?.user?.name} userRole={(session?.user as any)?.role} pageTitle="Τμήματα" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <DepartmentsManager
            departments={departments.map((d) => ({
              id: d.id,
              name: d.name,
              code: d.code,
              description: d.description,
              parentId: d.parentId,
              managerId: d.managerId,
              managerName: d.manager?.name ?? d.manager?.email ?? null,
              memberCount: d._count.members,
              childCount: d._count.children,
            }))}
            users={users.map((u) => ({ id: u.id, label: u.name ?? u.email ?? "—" }))}
          />
        </div>
      </main>
    </div>
  );
}
