import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loc } from "@/lib/localized";
import { ConsentForm } from "./consent-form";

export default async function PublicConsentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await prisma.consentProject.findUnique({
    where: { slug },
    include: { fields: { include: { field: true }, orderBy: { order: "asc" } }, purposes: { orderBy: { order: "asc" } } },
  });
  if (!project || project.status !== "ACTIVE") notFound();

  const fields = project.fields.map((pf) => ({
    key: pf.field.key,
    label: loc(pf.field.label, "el"),
    inputType: pf.field.inputType,
    required: pf.required,
  }));
  const purposes = project.purposes.map((p) => ({
    id: p.id, label: loc(p.label, "el"), description: loc(p.description, "el"), required: p.required,
  }));

  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h1 className="text-xl font-semibold mb-1">{project.name}</h1>
      <p className="text-sm text-gray-500 mb-6">{loc(project.description, "el")}</p>
      <ConsentForm slug={slug} fields={fields} purposes={purposes} />
    </div>
  );
}
