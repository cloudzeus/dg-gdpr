import { Topbar } from "@/components/layout/topbar";
import { auth } from "@/lib/auth";
import { getOrganization, updateOrganization } from "@/actions/organization";
import { LogoUploader } from "@/components/modules/logo-uploader";

async function handleUpdate(formData: FormData) {
  "use server";
  await updateOrganization(formData);
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2, Save } from "lucide-react";

export default async function CompanyPage() {
  const session = await auth();
  const org = await getOrganization();

  const phones = (org?.phones as any as { label: string; number: string }[]) ?? [];
  const emails = (org?.emails as any as { label: string; address: string }[]) ?? [];
  const domains = (org?.domains as any as string[]) ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar userName={session?.user?.name} userRole={(session?.user as any)?.role} pageTitle="Στοιχεία Εταιρείας" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <form action={handleUpdate}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4 text-primary" /> Γενικά Στοιχεία
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Εμπορική Επωνυμία *">
                    <Input name="name" defaultValue={org?.name ?? ""} required />
                  </Field>
                  <Field label="Νομική Επωνυμία">
                    <Input name="legalName" defaultValue={org?.legalName ?? ""} />
                  </Field>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="ΑΦΜ">
                    <Input name="vatNumber" defaultValue={org?.vatNumber ?? ""} />
                  </Field>
                  <Field label="ΔΟΥ">
                    <Input name="taxOffice" defaultValue={org?.taxOffice ?? ""} />
                  </Field>
                  <Field label="ΓΕΜΗ">
                    <Input name="registryNo" defaultValue={org?.registryNo ?? ""} />
                  </Field>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Logo Εταιρείας</label>
                  <LogoUploader currentLogo={org?.logo ?? null} />
                </div>
                <Field label="Περιγραφή / Δραστηριότητα">
                  <textarea
                    name="description"
                    defaultValue={org?.description ?? ""}
                    rows={3}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </Field>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Έδρα</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="Διεύθυνση">
                  <Input name="addressLine1" defaultValue={org?.addressLine1 ?? ""} placeholder="Οδός & Αριθμός" />
                </Field>
                <Field label="Διεύθυνση (2)">
                  <Input name="addressLine2" defaultValue={org?.addressLine2 ?? ""} />
                </Field>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Πόλη">
                    <Input name="city" defaultValue={org?.city ?? ""} />
                  </Field>
                  <Field label="ΤΚ">
                    <Input name="postalCode" defaultValue={org?.postalCode ?? ""} />
                  </Field>
                  <Field label="Χώρα">
                    <Input name="country" defaultValue={org?.country ?? "Ελλάδα"} />
                  </Field>
                </div>
                <Field label="Website">
                  <Input name="website" defaultValue={org?.website ?? ""} placeholder="https://..." />
                </Field>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Τηλέφωνα</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="grid grid-cols-[160px_1fr] gap-3">
                    <Input name="phoneLabel" defaultValue={phones[i]?.label ?? ""} placeholder="Ετικέτα (π.χ. Κεντρικό)" />
                    <Input name="phone" defaultValue={phones[i]?.number ?? ""} placeholder="+30 ..." />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Emails</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="grid grid-cols-[160px_1fr] gap-3">
                    <Input name="emailLabel" defaultValue={emails[i]?.label ?? ""} placeholder="Ετικέτα (π.χ. Info)" />
                    <Input name="email" type="email" defaultValue={emails[i]?.address ?? ""} placeholder="name@dgsmart.gr" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Domains</CardTitle>
              </CardHeader>
              <CardContent>
                <Field label="Λίστα domains (διαχωρισμένα με κόμμα ή κενό)">
                  <textarea
                    name="domains"
                    defaultValue={domains.join(", ")}
                    rows={2}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="dgsmart.gr, i4ria.com"
                  />
                </Field>
              </CardContent>
            </Card>

            <div className="flex justify-end mt-6">
              <Button type="submit" className="gap-1.5">
                <Save className="h-4 w-4" /> Αποθήκευση
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
