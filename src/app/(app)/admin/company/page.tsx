import { Topbar } from "@/components/layout/topbar";
import { auth } from "@/lib/auth";
import { getOrganization, updateOrganization } from "@/actions/organization";
import { OrgProfileForm } from "@/components/modules/org-profile-form";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

async function handleUpdate(formData: FormData) {
  "use server";
  await updateOrganization(formData);
}

export default async function CompanyPage() {
  const session = await auth();
  const org = await getOrganization();

  const phones = (org?.phones as { label: string; number: string }[] | null) ?? [];
  const emails = (org?.emails as { label: string; address: string }[] | null) ?? [];
  const domains = (org?.domains as string[] | null) ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        userName={session?.user?.name}
        userRole={(session?.user as any)?.role}
        pageTitle="Στοιχεία Εταιρείας"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Compliance package export */}
          <div
            className="flex items-center justify-between rounded-sm px-4 py-3"
            style={{ background: "rgba(0,120,212,0.05)", border: "1px solid rgba(0,120,212,0.18)" }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: "#0078d4" }}>Πακέτο Συμμόρφωσης GDPR</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Εξαγωγή Word με όλες τις ενεργές πολιτικές — για τρίτους Υπεύθυνους / Εκτελούντες Επεξεργασίας
              </p>
            </div>
            <a href="/api/export/compliance-package" download>
              <Button type="button" size="sm" className="gap-1.5 shrink-0">
                <FileDown className="h-4 w-4" /> Εξαγωγή Word
              </Button>
            </a>
          </div>

          <OrgProfileForm
            action={handleUpdate}
            logo={org?.logo ?? null}
            phones={phones}
            emails={emails}
            initial={{
              name: org?.name ?? "",
              legalName: org?.legalName ?? "",
              vatNumber: org?.vatNumber ?? "",
              taxOffice: org?.taxOffice ?? "",
              registryNo: org?.registryNo ?? "",
              description: org?.description ?? "",
              addressLine1: org?.addressLine1 ?? "",
              addressLine2: org?.addressLine2 ?? "",
              city: org?.city ?? "",
              postalCode: org?.postalCode ?? "",
              country: org?.country ?? "Ελλάδα",
              website: org?.website ?? "",
              domains: domains.join(", "),
            }}
          />
        </div>
      </main>
    </div>
  );
}
