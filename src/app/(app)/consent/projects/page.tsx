import Link from "next/link";
import { listConsentProjects, createConsentProject } from "@/actions/consent";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export default async function ConsentProjectsPage() {
  const projects = await listConsentProjects();

  async function create(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;
    await createConsentProject({ name, description: { el: "", en: "" }, confirmationMethod: "EMAIL" });
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-1">Consent Projects</h1>
      <p className="text-sm text-gray-500 mb-6">Καμπάνιες συλλογής συναινέσεων.</p>

      <form action={create} className="flex gap-2 mb-6">
        <input name="name" placeholder="Όνομα νέου project" className="border rounded px-3 py-2 text-sm flex-1 max-w-sm" />
        <Button type="submit">Δημιουργία</Button>
      </form>

      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr><th className="p-2">Όνομα</th><th className="p-2">Slug</th><th className="p-2">Κατάσταση</th><th className="p-2">Πεδία</th><th className="p-2">Σκοποί</th><th className="p-2">Συναινέσεις</th><th className="p-2">Δημιουργία</th></tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="p-2"><Link href={`/consent/projects/${p.id}`} className="text-blue-600 hover:underline">{p.name}</Link></td>
                <td className="p-2 font-mono">{p.slug}</td>
                <td className="p-2">{p.status}</td>
                <td className="p-2">{p._count.fields}</td>
                <td className="p-2">{p._count.purposes}</td>
                <td className="p-2">{p._count.records}</td>
                <td className="p-2">{formatDate(p.createdAt)}</td>
              </tr>
            ))}
            {projects.length === 0 && <tr><td className="p-4 text-gray-400" colSpan={7}>Δεν υπάρχουν projects ακόμη.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
