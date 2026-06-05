import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ManageActions } from "./manage-actions";

export default async function ManageActionsPage({ params }: { params: Promise<{ layout: string; slug: string; token: string }> }) {
  const { slug, token } = await params;
  const record = await prisma.consentRecord.findUnique({ where: { verifyToken: token }, include: { project: true } });
  if (!record || record.project.slug !== slug) notFound();

  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h1 className="text-xl font-semibold mb-1">Τα δεδομένα μου — {record.project.name}</h1>
      <p className="text-sm text-gray-500 mb-2">Email: {record.subjectEmail}</p>
      <p className="text-sm text-gray-500 mb-6">Κατάσταση: <strong>{record.status}</strong></p>
      <ManageActions slug={slug} token={token} withdrawn={record.status === "WITHDRAWN"} />
    </div>
  );
}
