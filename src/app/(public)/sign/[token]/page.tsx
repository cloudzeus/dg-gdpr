import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { documentTitle } from "@/lib/signature/document";
import { SignForm } from "./sign-form";
import type { SignatureRequest } from "@prisma/client";

const OPEN_STATUSES = ["PENDING", "SENT", "VIEWED"];

/**
 * Άγνωστο, ληγμένο, ακυρωμένο (DECLINED) ή ήδη υπογεγραμμένο token πρέπει να
 * δίνουν την ΙΔΙΑ απάντηση — καμία διάκριση, καμία απαρίθμηση. Ο έλεγχος
 * λήξης γίνεται και εδώ (όχι μόνο μέσω `status === "EXPIRED"`), γιατί το
 * cron job που γυρίζει το status μπορεί να μην έχει τρέξει ακόμα.
 */
function isActive(request: SignatureRequest | null): request is SignatureRequest {
  if (!request) return false;
  if (!OPEN_STATUSES.includes(request.status)) return false;
  if (request.expiresAt.getTime() < Date.now()) return false;
  return true;
}

function InactiveLinkNotice() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F8] px-4 py-10">
      <div className="mx-auto max-w-md rounded-xl border bg-white p-8 text-center shadow-sm" style={{ borderColor: "#EDEBE9" }}>
        <h1 className="text-lg font-bold" style={{ color: "#201F1E" }}>Ο σύνδεσμος δεν είναι πλέον ενεργός.</h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "#605E5C" }}>
          Αν χρειάζεστε νέο σύνδεσμο, επικοινωνήστε με τον αποστολέα του εγγράφου.
        </p>
      </div>
    </div>
  );
}

export default async function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const request = await prisma.signatureRequest.findUnique({ where: { token } });

  if (!isActive(request)) {
    return <InactiveLinkNotice />;
  }

  // Πρώτη προβολή: SENT -> VIEWED. Ασφαλές να ξανατρέξει (idempotent μετά την
  // πρώτη φορά, αφού το status δεν θα είναι πια SENT).
  if (request.status === "SENT") {
    await prisma.signatureRequest.update({
      where: { id: request.id },
      data: { status: "VIEWED", viewedAt: new Date() },
    });
  }

  const [org, company, title] = await Promise.all([
    prisma.organization.findFirst({ select: { name: true } }),
    request.companyId
      ? prisma.company.findUnique({ where: { id: request.companyId }, select: { name: true } })
      : Promise.resolve(null),
    documentTitle(request.entityType, request.entityId),
  ]);

  // Μόνο το έγγραφο και τα μέρη του — τίποτα άλλο από το σύστημα (ούτε κενά
  // συμμόρφωσης, ούτε προφίλ, ούτε άλλα έργα). Δημόσια σελίδα, σύνδεσμος
  // μπορεί να προωθηθεί.
  return (
    <div className="min-h-screen bg-[#FAF9F8] px-4 py-10">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="rounded-xl border bg-white p-6 shadow-sm" style={{ borderColor: "#EDEBE9" }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#0078D4" }}>
            Έγγραφο προς υπογραφή
          </p>
          <h1 className="mt-1 text-xl font-bold" style={{ color: "#201F1E" }}>{title}</h1>
          <p className="mt-2 text-sm" style={{ color: "#605E5C" }}>
            Μεταξύ <strong style={{ color: "#201F1E" }}>{org?.name ?? "Ο Οργανισμός μας"}</strong> και{" "}
            <strong style={{ color: "#201F1E" }}>{company?.name ?? request.recipientName}</strong>
          </p>
          <a
            href={request.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm font-semibold"
            style={{ color: "#0078D4" }}
          >
            Προβολή πλήρους εγγράφου →
          </a>
          <p className="mt-4 text-xs" style={{ color: "#605E5C" }}>
            Ο σύνδεσμος λήγει στις <strong>{formatDateTime(request.expiresAt)}</strong>.
          </p>
        </div>

        <SignForm token={token} recipientName={request.recipientName} />
      </div>
    </div>
  );
}
