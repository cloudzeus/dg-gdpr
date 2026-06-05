import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loc } from "@/lib/localized";
import { ConsentForm } from "./consent-form";

export default async function PublicConsentPage({ params }: { params: Promise<{ layout: string; slug: string }> }) {
  const { slug } = await params;
  const project = await prisma.consentProject.findUnique({
    where: { slug },
    include: { fields: { include: { field: true }, orderBy: { order: "asc" } }, purposes: { orderBy: { order: "asc" } } },
  });
  if (!project || project.status !== "ACTIVE") notFound();

  const description = loc(project.description, "el");

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
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm" style={{ borderColor: "#EDEBE9" }}>
      <div style={{ height: 4, background: "var(--accent, #0078D4)" }} />
      <div className="p-6 sm:p-7">
        <div className="mb-5 border-b pb-4" style={{ borderColor: "#EDEBE9" }}>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "#201F1E" }}>{project.name}</h1>
          {description && <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "#605E5C" }}>{description}</p>}
        </div>
        <ConsentForm slug={slug} fields={fields} purposes={purposes} />
      </div>
    </div>
  );
}
