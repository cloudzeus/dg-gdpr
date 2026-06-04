import { ShieldCheck } from "lucide-react";

/**
 * Lightweight in-page footer for app screens. Sits at the bottom of the
 * scrollable <main>, so long pages get a clear end-of-content marker.
 */
export function AppFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-10 border-t border-neutral-200 pt-5 pb-2 text-xs text-neutral-500">
      <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#0078d4]" />
          <span>GDPR Compliance OS — Διαχείριση Συναινέσεων</span>
        </div>
        <div className="flex items-center gap-4">
          <span>© {year} DG Smart</span>
          <span className="hidden sm:inline">Σύμφωνο με GDPR (ΕΕ 2016/679)</span>
        </div>
      </div>
    </footer>
  );
}
