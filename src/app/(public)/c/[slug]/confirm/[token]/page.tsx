import { prisma } from "@/lib/prisma";

export default async function ConfirmResultPage({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { token } = await params;
  const record = await prisma.consentRecord.findUnique({ where: { verifyToken: token } });
  const ok = record?.status === "CONFIRMED";

  return (
    <div className="bg-white border rounded-lg p-8 shadow-sm text-center">
      {ok ? (
        <>
          <p className="text-green-600 text-lg font-semibold">Η συναίνεσή σας επιβεβαιώθηκε ✔</p>
          <p className="text-sm text-gray-500 mt-2">Καταγράφηκε με ασφάλεια η ημερομηνία, η ώρα και η IP σας ως απόδειξη συναίνεσης.</p>
        </>
      ) : (
        <>
          <p className="text-red-600 text-lg font-semibold">Μη έγκυρος ή ληγμένος σύνδεσμος</p>
          <p className="text-sm text-gray-500 mt-2">Υποβάλετε ξανά τη φόρμα συναίνεσης για να λάβετε νέο σύνδεσμο.</p>
        </>
      )}
    </div>
  );
}
