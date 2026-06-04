import { listPersonalDataFields } from "@/actions/consent";
import { FieldsManager } from "./fields-manager";

export default async function ConsentFieldsPage() {
  const fields = await listPersonalDataFields();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-1">Πεδία Προσωπικών Δεδομένων</h1>
      <p className="text-sm text-gray-500 mb-6">Βιβλιοθήκη πεδίων με πολυγλωσσικές περιγραφές και προτεινόμενη νομική βάση (GDPR).</p>
      <FieldsManager initialFields={JSON.parse(JSON.stringify(fields))} />
    </div>
  );
}
