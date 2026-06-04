import { notFound } from "next/navigation";
import Link from "next/link";
import { getConsentProjectById, listPersonalDataFields } from "@/actions/consent";
import { ProjectEditor } from "./project-editor";

export default async function ConsentProjectEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project, allFields] = await Promise.all([getConsentProjectById(id), listPersonalDataFields()]);
  if (!project) notFound();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        <Link href={`/consent/projects/${id}/records`} className="text-blue-600 hover:underline text-sm">Συναινέσεις →</Link>
      </div>
      <ProjectEditor
        project={JSON.parse(JSON.stringify(project))}
        allFields={JSON.parse(JSON.stringify(allFields))}
      />
    </div>
  );
}
