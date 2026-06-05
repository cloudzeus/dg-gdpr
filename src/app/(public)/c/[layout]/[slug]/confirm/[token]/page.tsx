import { ShieldCheck, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export default async function ConfirmResultPage({ params }: { params: Promise<{ layout: string; slug: string; token: string }> }) {
  const { layout, token } = await params;
  const record = await prisma.consentRecord.findUnique({ where: { verifyToken: token }, include: { project: true } });
  const ok = record?.status === "CONFIRMED";

  const accent = ok ? "#107C10" : "#A4262C";
  const tint = ok ? "#E7F6E7" : "#FDE7E9";

  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm" style={{ borderColor: "#EDEBE9" }}>
      <div style={{ height: 4, background: accent }} />
      <div className="px-8 py-10 text-center">
        <div
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: tint, color: accent }}
        >
          {ok ? <ShieldCheck className="h-8 w-8" /> : <AlertTriangle className="h-8 w-8" />}
        </div>

        <h1 className="text-xl font-bold" style={{ color: "#201F1E" }}>
          {ok ? "Η συναίνεσή σας επιβεβαιώθηκε" : "Μη έγκυρος ή ληγμένος σύνδεσμος"}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed" style={{ color: "#605E5C" }}>
          {ok
            ? "Καταγράφηκαν με ασφάλεια η ημερομηνία, η ώρα και η IP σας ως απόδειξη συναίνεσης."
            : "Ο σύνδεσμος δεν είναι πλέον έγκυρος. Υποβάλετε ξανά τη φόρμα συναίνεσης για να λάβετε νέο σύνδεσμο."}
        </p>

        {ok && record?.confirmedAt && (
          <div
            className="mx-auto mt-5 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm"
            style={{ borderColor: "#C7E6C7", background: "#F0F9F0", color: "#11600F" }}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Επιβεβαιώθηκε: <strong>{formatDateTime(record.confirmedAt)}</strong></span>
          </div>
        )}

        {!ok && record?.project?.slug && (
          <a
            href={`/c/${layout}/${record.project.slug}`}
            className="mt-6 inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-semibold text-white"
            style={{ background: "var(--accent, #0078D4)" }}
          >
            Επιστροφή στη φόρμα συναίνεσης
          </a>
        )}
      </div>
    </div>
  );
}
