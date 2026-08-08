import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { OrgGap } from "@/lib/org-completeness";

/**
 * Προειδοποίηση για ελλιπή στοιχεία εταιρείας.
 *
 * Σε δύο εντάσεις: κόκκινη όταν λείπει κάτι απαραίτητο για την αναγνώριση
 * της εταιρείας (ΑΦΜ, domains, επωνυμία), κίτρινη όταν λείπουν μόνο
 * συμπληρωματικά στοιχεία.
 */
export function OrgGapsNotice({
  gaps,
  href,
  className = "",
}: {
  gaps: OrgGap[];
  /** Αν δοθεί, όλο το banner γίνεται σύνδεσμος προς τα στοιχεία εταιρείας. */
  href?: string;
  className?: string;
}) {
  if (gaps.length === 0) return null;

  const missingRequired = gaps.filter((g) => g.severity === "required");
  const critical = missingRequired.length > 0;
  const shown = critical ? missingRequired : gaps;

  const tone = critical
    ? { color: "#a4262c", bg: "rgba(164,38,44,0.06)", border: "rgba(164,38,44,0.22)" }
    : { color: "#8a6d00", bg: "rgba(255,185,0,0.08)", border: "rgba(255,185,0,0.30)" };

  const body = (
    <div
      className={`flex items-start gap-3 rounded-sm px-4 py-3 ${className}`}
      style={{ background: tone.bg, border: `1px solid ${tone.border}` }}
    >
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: tone.color }} />
      <div className="min-w-0">
        <p className="text-sm font-semibold" style={{ color: tone.color }}>
          {critical ? "Ελλιπή στοιχεία εταιρείας" : "Συμπληρωματικά στοιχεία εταιρείας"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Λείπουν: <strong>{shown.map((g) => g.label).join(", ")}</strong>
          {critical
            ? " — χωρίς αυτά η εταιρεία σας δεν αναγνωρίζεται αυτόματα σε συμβάσεις και έγγραφα."
            : " — προτείνεται η συμπλήρωσή τους για πληρέστερα έγγραφα."}
        </p>
      </div>
    </div>
  );

  if (!href) return body;

  return (
    <Link href={href} className="block transition-opacity hover:opacity-80">
      {body}
    </Link>
  );
}
