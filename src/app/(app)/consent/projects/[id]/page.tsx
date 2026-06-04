import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getConsentProjectById, listPersonalDataFields } from "@/actions/consent";
import { Topbar } from "@/components/layout/topbar";
import { AppFooter } from "@/components/layout/app-footer";
import { ProjectEditor } from "./project-editor";

export default async function ConsentProjectEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const [project, allFields, policies] = await Promise.all([
    getConsentProjectById(id),
    listPersonalDataFields(),
    prisma.policyDocument.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, title: true, type: true, fileUrl: true },
      orderBy: { title: "asc" },
    }),
  ]);
  if (!project) notFound();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        userName={session?.user?.name}
        userRole={(session?.user as { role?: string } | undefined)?.role}
        pageTitle="Επεξεργασία Consent Project"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 flex items-center justify-between gap-3">
            <Link
              href="/consent/projects"
              className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Όλα τα projects
            </Link>
            <Link
              href={`/consent/projects/${id}/records`}
              className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-[#0078d4] hover:bg-blue-50"
            >
              <Users className="h-4 w-4" />
              Συναινέσεις
            </Link>
          </div>

          <ProjectEditor
            project={JSON.parse(JSON.stringify(project))}
            allFields={JSON.parse(JSON.stringify(allFields))}
            policies={JSON.parse(JSON.stringify(policies))}
          />

          <AppFooter />
        </div>
      </main>
    </div>
  );
}
