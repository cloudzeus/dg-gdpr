import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const dbUser = session.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { isSuperAdmin: true } })
    : null;
  const isSuperAdmin = dbUser?.isSuperAdmin ?? false;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isSuperAdmin={isSuperAdmin} />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
