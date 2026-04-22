import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfileEditor } from "@/components/modules/profile-editor";
import { Shield, Building2, GraduationCap, ChevronRight } from "lucide-react";
import Link from "next/link";

export default async function SettingsPage() {
  const session = await auth();

  const user = await prisma.user.findUnique({
    where: { id: session!.user!.id! },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      phone: true,
      address: true,
      department: { select: { id: true, name: true } },
      position: { select: { id: true, title: true } },
    },
  });

  if (!user) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        userName={session?.user?.name}
        userRole={(session?.user as any)?.role}
        pageTitle="Ρυθμίσεις"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-6">

          {/* Profile card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-primary" /> Προφίλ Χρήστη
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProfileEditor
                user={{
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  image: user.image,
                  role: user.role as string,
                  phone: user.phone,
                  address: user.address,
                  departmentName: user.department?.name ?? null,
                  positionTitle: user.position?.title ?? null,
                }}
              />
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Ρόλος συστήματος</span>
                  <Badge>
                    {({
                      ADMIN: "Διαχειριστής",
                      DPO: "ΥΠΔ",
                      SECURITY_OFFICER: "Υπεύθυνος Ασφαλείας",
                      COMPLIANCE_OFFICER: "Υπεύθυνος Συμμόρφωσης",
                      IT_MANAGER: "IT Manager",
                      HR_MANAGER: "HR Manager",
                      DEVELOPER: "Προγραμματιστής",
                      USER: "Χρήστης",
                    } as Record<string, string>)[user.role] ?? user.role}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* My training */}
          <Link href="/my/training">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Οι Εκπαιδεύσεις μου</p>
                  <p className="text-xs text-muted-foreground">Ιστορικό τεστ και βαθμολογιών</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>

          {/* Auth info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-primary" /> Ασφάλεια & Πιστοποίηση
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
                <span className="text-sm font-medium">Πάροχος Σύνδεσης</span>
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 21 21" fill="none">
                    <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                    <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                    <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                    <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                  </svg>
                  <span className="text-sm text-muted-foreground">Microsoft Entra ID</span>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
                <span className="text-sm font-medium">MFA</span>
                <Badge variant="success">Ενεργό (Microsoft 365)</Badge>
              </div>
            </CardContent>
          </Card>

          {/* System info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-primary" /> Πληροφορίες Συστήματος
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Πλατφόρμα", value: "GDPR Compliance OS v1.0" },
                { label: "Πλαίσιο", value: "GDPR (ΕΕ) 2016/679" },
                { label: "Δικαιοδοσία", value: "Ελλάδα / Ευρωπαϊκή Ένωση" },
                { label: "Εποπτική Αρχή", value: "ΑΠΔΠΧ — www.dpa.gr" },
                { label: "Framework", value: "Next.js 16.2 + Prisma + MySQL" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-sm text-muted-foreground">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
