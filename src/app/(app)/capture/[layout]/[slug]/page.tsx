import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loc } from "@/lib/localized";
import { CAPTURE_TEMPLATES } from "@/components/capture/templates";

export default async function CaptureRunPage({ params }: { params: Promise<{ layout: string; slug: string }> }) {
  const { layout, slug } = await params;

  // The layout folder is taken from the URL and must match a registered template.
  const Template = CAPTURE_TEMPLATES[layout];
  if (!Template) notFound();

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

  const org = await prisma.organization.findFirst({ select: { logo: true } });
  const cdn = process.env.BUNNY_CDN_HOSTNAME ?? "dgsoft.b-cdn.net";
  const logoUrl = org?.logo || `https://${cdn}/logos/org-logo.png`;

  return <Template project={{ slug, name: project.name, description: loc(project.description, "el") }} fields={fields} purposes={purposes} logoUrl={logoUrl} />;
}
