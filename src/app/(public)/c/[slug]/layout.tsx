import { ShieldCheck } from "lucide-react";

export default function PublicConsentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center px-4 py-10 sm:py-14"
      style={{ background: "linear-gradient(180deg,#FAF9F8 0%,#F3F2F1 100%)" }}
    >
      <div className="w-full max-w-lg">
        {/* Brand */}
        <div className="mb-5 flex items-center gap-3 px-1">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-sm"
            style={{ background: "#0078D4" }}
          >
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="leading-none">
            <p className="text-[15px] font-semibold" style={{ color: "#201F1E" }}>GDPR Compliance OS</p>
            <p className="mt-1 text-[11px]" style={{ color: "#605E5C" }}>DG Smart · Προστασία Δεδομένων Προσωπικού Χαρακτήρα</p>
          </div>
        </div>

        {children}

        <p className="mt-6 text-center text-[11px] leading-relaxed" style={{ color: "#8A8886" }}>
          Τα δεδομένα σας υποβάλλονται σε επεξεργασία σύμφωνα με τον Κανονισμό (ΕΕ) 2016/679 (GDPR).
          <br />© DG Smart — με την επιφύλαξη παντός δικαιώματος.
        </p>
      </div>
    </div>
  );
}
