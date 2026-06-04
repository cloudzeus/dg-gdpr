import { notFound } from "next/navigation";
import { getConsentProjectById, listConsentRecords } from "@/actions/consent";
import { formatDateTime } from "@/lib/utils";

export default async function ConsentRecordsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getConsentProjectById(id);
  if (!project) notFound();
  const records = await listConsentRecords(id);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Συναινέσεις — {project.name}</h1>
        <a href={`/api/export/consent/${id}`} className="bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700">Εξαγωγή Excel</a>
      </div>
      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr><th className="p-2">Email</th><th className="p-2">Κατάσταση</th><th className="p-2">Επιβεβαίωση</th><th className="p-2">IP</th><th className="p-2">User-Agent</th></tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.subjectEmail}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2">{formatDateTime(r.confirmedAt)}</td>
                <td className="p-2 font-mono">{r.ipAddress ?? "—"}</td>
                <td className="p-2 max-w-xs truncate text-gray-500">{r.userAgent ?? "—"}</td>
              </tr>
            ))}
            {records.length === 0 && <tr><td className="p-4 text-gray-400" colSpan={5}>Καμία συναίνεση ακόμη.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
