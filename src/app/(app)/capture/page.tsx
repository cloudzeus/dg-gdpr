import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loc } from "@/lib/localized";
import { Topbar } from "@/components/layout/topbar";

export default async function CapturePickerPage() {
  const session = await auth();
  const projects = await prisma.consentProject.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, description: true, layoutTemplate: true },
  });

  if (projects.length === 1) redirect(`/capture/${projects[0].layoutTemplate}/${projects[0].slug}`);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar userName={session?.user?.name} userRole={(session?.user as { role?: string } | undefined)?.role} pageTitle="Λήψη Συναίνεσης" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold" style={{ color: "#201F1E" }}>Επιλέξτε project</h1>
          <p className="mt-1 mb-6 text-sm" style={{ color: "#605E5C" }}>Διαλέξτε για ποιο project θα καταχωρήσετε συναίνεση.</p>
          {projects.length === 0 ? (
            <p className="text-sm text-neutral-500">Δεν υπάρχουν ενεργά projects.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/capture/${p.layoutTemplate}/${p.slug}`}
                  className="rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                  style={{ borderColor: "#EDEBE9" }}
                >
                  <div className="mb-3 h-1 w-10 rounded-full" style={{ background: "#0078D4" }} />
                  <p className="text-base font-semibold" style={{ color: "#201F1E" }}>{p.name}</p>
                  <p className="mt-1 line-clamp-2 text-sm" style={{ color: "#605E5C" }}>{loc(p.description, "el")}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
