import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserRoleEditor } from "@/components/modules/user-role-editor";
import { FiUsers, FiShield, FiLock } from "react-icons/fi";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Διαχειριστής",
  DPO: "ΥΠΔ (DPO)",
  SECURITY_OFFICER: "Υπεύθυνος Ασφαλείας",
  COMPLIANCE_OFFICER: "Υπεύθυνος Συμμόρφωσης",
  IT_MANAGER: "IT Manager",
  HR_MANAGER: "HR Manager",
  DEVELOPER: "Προγραμματιστής",
  USER: "Χρήστης",
};

const ROLE_ACCESS: Record<string, string[]> = {
  ADMIN: [
    "Πίνακας Ελέγχου", "Αξιολόγηση GDPR", "Ανάπτυξη", "VoIP",
    "Ροές Δεδομένων", "DPIA & DPA", "Δικαίωμα Λήθης",
    "Εκπαίδευση", "Αναφορές", "Αρχείο Ελέγχου", "Ρυθμίσεις", "Διαχείριση Ρόλων",
  ],
  DPO: [
    "Πίνακας Ελέγχου", "Αξιολόγηση GDPR", "Ροές Δεδομένων",
    "DPIA & DPA", "Δικαίωμα Λήθης", "Εκπαίδευση", "Αναφορές", "Αρχείο Ελέγχου",
  ],
  DEVELOPER: [
    "Πίνακας Ελέγχου", "Ανάπτυξη", "VoIP", "Εκπαίδευση", "Αναφορές",
  ],
  USER: [
    "Πίνακας Ελέγχου", "Εκπαίδευση",
  ],
};

const ROLE_BADGE: Record<string, "default" | "success" | "warning" | "secondary"> = {
  ADMIN: "default",
  DPO: "success",
  SECURITY_OFFICER: "warning",
  COMPLIANCE_OFFICER: "success",
  IT_MANAGER: "default",
  HR_MANAGER: "default",
  DEVELOPER: "warning",
  USER: "secondary",
};

export default async function RolesPage() {
  const session = await auth();
  const currentUser = session?.user as any;
  if (currentUser?.role !== "ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      department: { select: { name: true } },
      position: { select: { title: true } },
      createdAt: true,
    },
  });

  const roleCounts = users.reduce(
    (acc, u) => ({ ...acc, [u.role]: (acc[u.role as keyof typeof acc] ?? 0) + 1 }),
    {} as Record<string, number>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        userName={session?.user?.name}
        userRole={currentUser?.role}
        pageTitle="Διαχείριση Ρόλων & Πρόσβασης"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {Object.entries(ROLE_LABELS).map(([role, label]) => (
              <div key={role} className="rounded-xl border border-border bg-card p-3 text-center">
                <p className="text-2xl font-bold text-primary">{roleCounts[role] ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Role matrix */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FiShield className="h-4 w-4 text-primary" /> Μήτρα Δικαιωμάτων Πρόσβασης
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Σελίδα</th>
                      {Object.entries(ROLE_LABELS).map(([role, label]) => (
                        <th key={role} className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ROLE_ACCESS.ADMIN.map((page) => (
                      <tr key={page} className="border-b border-border hover:bg-secondary/30">
                        <td className="px-3 py-2 font-medium">{page}</td>
                        {(["ADMIN", "DPO", "DEVELOPER", "USER"] as const).map((role) => (
                          <td key={role} className="px-3 py-2 text-center">
                            {ROLE_ACCESS[role].includes(page) ? (
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-700 text-xs">✓</span>
                            ) : (
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-50 text-red-400 text-xs">✗</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Users list */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FiUsers className="h-4 w-4 text-primary" /> Χρήστες ({users.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-4 rounded-lg border border-border bg-secondary/20 px-4 py-3"
                  >
                    {/* Avatar */}
                    {u.image ? (
                      <img src={u.image} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                        {u.name?.[0]?.toUpperCase() ?? "U"}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{u.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      {(u.department || u.position) && (
                        <p className="text-xs text-muted-foreground">
                          {[u.position?.title, u.department?.name].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>

                    {/* Role editor */}
                    <div className="shrink-0">
                      {u.id === (session?.user as any)?.id ? (
                        <Badge variant={ROLE_BADGE[u.role]}>
                          <FiLock className="h-3 w-3 mr-1" />
                          {ROLE_LABELS[u.role] ?? u.role}
                        </Badge>
                      ) : (
                        <UserRoleEditor userId={u.id} currentRole={u.role} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
