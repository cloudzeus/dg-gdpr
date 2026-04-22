import { auth } from "@/lib/auth";
import { Topbar } from "@/components/layout/topbar";
import { LegalSidebar } from "@/components/shared/legal-sidebar";
import { DepartmentFlows } from "@/components/modules/department-flows";
import { getDepartmentFlows } from "@/actions/dataflows";
import { MdAccountTree, MdInfo } from "react-icons/md";

export default async function MapperPage() {
  const session = await auth();
  const departments = await getDepartmentFlows();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        userName={session?.user?.name}
        userRole={(session?.user as any)?.role}
        pageTitle="Ροές Δεδομένων"
      />
      <main className="flex-1 overflow-y-auto p-5">
        <div className="flex gap-5 min-h-full">
          {/* Main content */}
          <div className="flex-1 space-y-4 min-w-0">
            {/* Page header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MdAccountTree size={20} style={{ color: "rgb(0,120,212)" }} />
                  <h2 className="text-[18px] font-semibold" style={{ color: "rgb(var(--foreground))" }}>
                    Χαρτογράφηση Ροών Δεδομένων ανά Τμήμα
                  </h2>
                </div>
                <p className="text-[13px]" style={{ color: "rgb(var(--muted-foreground))" }}>
                  Αρχείο Δραστηριοτήτων Επεξεργασίας (RoPA) — Άρθρο 30 GDPR
                </p>
              </div>
            </div>

            {/* How-to guide strip */}
            <div
              className="flex items-start gap-3 rounded-sm p-3 text-[12px]"
              style={{
                background: "rgba(0,120,212,0.05)",
                border: "1px solid rgba(0,120,212,0.2)",
                color: "rgb(var(--foreground))",
              }}
            >
              <MdInfo size={16} style={{ color: "rgb(0,120,212)", flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong>Πώς λειτουργεί:</strong>{" "}
                Κάθε τμήμα εμφανίζει τις κατηγορίες δεδομένων που επεξεργάζεται, τη νομική βάση και τους αποδέκτες.
                Πατήστε <strong>«Επεξεργασία»</strong> για να προσθέσετε ή να τροποποιήσετε εγγραφές.
                Εναλλάξτε σε <strong>«Πίνακας RoPA»</strong> για συνολική εικόνα.
              </div>
            </div>

            <DepartmentFlows departments={departments} />
          </div>

          {/* Legal sidebar */}
          <LegalSidebar
            title="Ροές Δεδομένων & RoPA"
            summary="Κάθε οργανισμός που επεξεργάζεται προσωπικά δεδομένα υποχρεούται να τηρεί αρχείο δραστηριοτήτων επεξεργασίας ανά τμήμα (RoPA)."
            articles={[
              {
                number: "30",
                title: "Αρχείο Δραστηριοτήτων (RoPA)",
                summary: "Υποχρεωτική τήρηση αρχείου με σκοπούς, κατηγορίες δεδομένων, αποδέκτες και χρόνο διατήρησης.",
              },
              {
                number: "5(1)(ε)",
                title: "Περιορισμός Αποθήκευσης",
                summary: "Τα δεδομένα δεν διατηρούνται περισσότερο από όσο απαιτεί ο σκοπός επεξεργασίας.",
              },
              {
                number: "44-49",
                title: "Διαβιβάσεις εκτός ΕΕ",
                summary: "Απαιτείται ειδική νομική βάση για κάθε διαβίβαση εκτός ΕΕ/ΕΟΧ (SCCs, BCRs ή επαρκής χώρα).",
              },
            ]}
            tips={[
              "Ενημερώνετε το RoPA κάθε φορά που αλλάζει η επεξεργασία",
              "Τεκμηριώστε SCCs για κάθε ροή εκτός ΕΕ",
              "Υψηλός κίνδυνος = υποχρεωτική DPIA (Άρθρο 35)",
              "Ελέγξτε κάθε αποδέκτη δεδομένων για υπογεγραμμένη DPA",
            ]}
          />
        </div>
      </main>
    </div>
  );
}
