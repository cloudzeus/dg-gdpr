import { auth } from "@/lib/auth";
import { listPersonalDataFields } from "@/actions/consent";
import { Topbar } from "@/components/layout/topbar";
import { AppFooter } from "@/components/layout/app-footer";
import { FieldsManager } from "./fields-manager";

export default async function ConsentFieldsPage() {
  const session = await auth();
  const fields = await listPersonalDataFields();
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        userName={session?.user?.name}
        userRole={(session?.user as { role?: string } | undefined)?.role}
        pageTitle="Πεδία Προσωπικών Δεδομένων"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="mb-1 text-2xl font-semibold text-neutral-900">Πεδία Προσωπικών Δεδομένων</h1>
          <p className="mb-6 text-sm text-neutral-500">Βιβλιοθήκη πεδίων με πολυγλωσσικές περιγραφές και προτεινόμενη νομική βάση (GDPR).</p>
          <FieldsManager initialFields={JSON.parse(JSON.stringify(fields))} />
          <AppFooter />
        </div>
      </main>
    </div>
  );
}
