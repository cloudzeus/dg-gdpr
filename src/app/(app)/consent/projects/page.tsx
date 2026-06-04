import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, FolderOpen, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { listConsentProjects, createConsentProject } from "@/actions/consent";
import { Topbar } from "@/components/layout/topbar";
import { AppFooter } from "@/components/layout/app-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

const STATUS_META: Record<string, { label: string; variant: "secondary" | "success" | "outline" }> = {
  DRAFT: { label: "Προσχέδιο", variant: "secondary" },
  ACTIVE: { label: "Ενεργό", variant: "success" },
  ARCHIVED: { label: "Αρχειοθετημένο", variant: "outline" },
};

export default async function ConsentProjectsPage() {
  const session = await auth();
  const projects = await listConsentProjects();

  async function create(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;
    const created = await createConsentProject({ name, description: { el: "", en: "" }, confirmationMethod: "EMAIL" });
    redirect(`/consent/projects/${created.id}`);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        userName={session?.user?.name}
        userRole={(session?.user as { role?: string } | undefined)?.role}
        pageTitle="Consent Projects"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-neutral-900">Consent Projects</h1>
            <Badge variant="outline">{projects.length}</Badge>
          </div>
          <p className="mb-6 text-sm text-neutral-500">Καμπάνιες συλλογής συναινέσεων με double opt-in και απόδειξη συγκατάθεσης.</p>

          {/* Create */}
          <form action={create} className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
            <Plus className="h-5 w-5 text-[#0078d4]" />
            <input
              name="name"
              required
              placeholder="Όνομα νέου project (π.χ. Newsletter 2026)"
              className="h-9 flex-1 min-w-[220px] rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-[#0078d4]"
            />
            <Button type="submit">Δημιουργία &amp; ρύθμιση</Button>
          </form>

          {/* List */}
          {projects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-300 bg-white py-16 text-center">
              <FolderOpen className="mx-auto mb-3 h-8 w-8 text-neutral-300" />
              <p className="text-sm text-neutral-500">Δεν υπάρχουν projects ακόμη. Δημιουργήστε το πρώτο σας παραπάνω.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Όνομα</th>
                    <th className="px-4 py-2.5 font-medium">Slug</th>
                    <th className="px-4 py-2.5 font-medium">Κατάσταση</th>
                    <th className="px-4 py-2.5 text-center font-medium">Πεδία</th>
                    <th className="px-4 py-2.5 text-center font-medium">Σκοποί</th>
                    <th className="px-4 py-2.5 text-center font-medium">Συναινέσεις</th>
                    <th className="px-4 py-2.5 font-medium">Δημιουργία</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => {
                    const meta = STATUS_META[p.status] ?? STATUS_META.DRAFT;
                    return (
                      <tr key={p.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                        <td className="px-4 py-3">
                          <Link href={`/consent/projects/${p.id}`} className="font-medium text-neutral-800 hover:text-[#0078d4]">{p.name}</Link>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-neutral-500">/{p.slug}</td>
                        <td className="px-4 py-3"><Badge variant={meta.variant}>{meta.label}</Badge></td>
                        <td className="px-4 py-3 text-center text-neutral-600">{p._count.fields}</td>
                        <td className="px-4 py-3 text-center text-neutral-600">{p._count.purposes}</td>
                        <td className="px-4 py-3 text-center font-medium text-neutral-800">{p._count.records}</td>
                        <td className="px-4 py-3 text-neutral-500">{formatDate(p.createdAt)}</td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/consent/projects/${p.id}`} className="inline-flex items-center gap-1 text-xs text-[#0078d4] hover:underline">
                            Ρύθμιση <ArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <AppFooter />
        </div>
      </main>
    </div>
  );
}
