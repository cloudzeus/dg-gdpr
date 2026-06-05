import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loc } from "@/lib/localized";
import { resolveTemplate } from "@/components/capture/templates";

export default async function CaptureRunPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await prisma.consentProject.findUnique({
    where: { slug },
    include: { fields: { include: { field: true }, orderBy: { order: "asc" } }, purposes: { orderBy: { order: "asc" } } },
  });
  if (!project || project.status !== "ACTIVE") notFound();

  const fields = project.fields.map((pf) => ({
    key: pf.field.key, label: loc(pf.field.label, "el"), inputType: pf.field.inputType, required: pf.required,
  }));
  const purposes = project.purposes.map((p) => ({
    id: p.id, label: loc(p.label, "el"), description: loc(p.description, "el"), required: p.required,
  }));

  const Template = resolveTemplate(project.layoutTemplate);
  return <Template project={{ slug, name: project.name, description: loc(project.description, "el") }} fields={fields} purposes={purposes} />;
}
