import { Topbar } from "@/components/layout/topbar";
import { auth } from "@/lib/auth";
import { listCompanies } from "@/actions/companies";
import { CompaniesManager } from "@/components/modules/companies-manager";

export default async function CompaniesPage() {
  const session = await auth();
  const companies = await listCompanies();
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar userName={session?.user?.name} userRole={(session?.user as any)?.role} pageTitle="Πελάτες & Προμηθευτές" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <CompaniesManager
            companies={companies.map((c) => ({
              id: c.id,
              name: c.name,
              legalName: c.legalName,
              vatNumber: c.vatNumber,
              taxOffice: c.taxOffice,
              registryNo: c.registryNo,
              email: c.email,
              phone: c.phone,
              website: c.website,
              addressLine1: c.addressLine1,
              addressLine2: c.addressLine2,
              city: c.city,
              postalCode: c.postalCode,
              country: c.country,
              relationships: (c.relationships as string[] | null) ?? [],
              contactName: c.contactName,
              contactEmail: c.contactEmail,
              contactPhone: c.contactPhone,
              notes: c.notes,
              isActive: c.isActive,
              dpaCount: c._count.dpaContracts,
            }))}
          />
        </div>
      </main>
    </div>
  );
}
