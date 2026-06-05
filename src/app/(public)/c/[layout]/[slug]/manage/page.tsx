import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ManageRequestForm } from "./manage-request-form";

export default async function ManageRequestPage({ params }: { params: Promise<{ layout: string; slug: string }> }) {
  const { slug } = await params;
  const project = await prisma.consentProject.findUnique({ where: { slug } });
  if (!project) notFound();
  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h1 className="text-xl font-semibold mb-1">Διαχείριση δεδομένων — {project.name}</h1>
      <p className="text-sm text-gray-500 mb-6">Εισάγετε το email σας. Θα λάβετε σύνδεσμο για ανάκληση συναίνεσης ή λήψη των δεδομένων σας.</p>
      <ManageRequestForm slug={slug} />
    </div>
  );
}
