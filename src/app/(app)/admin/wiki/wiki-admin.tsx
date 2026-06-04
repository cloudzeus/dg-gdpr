"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Loader2, ExternalLink, X } from "lucide-react";
import { createArticle, updateArticle, deleteArticle } from "@/actions/wiki";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

interface Article {
  id: string;
  slug: string;
  title: string;
  category: string;
  categoryOrder: number;
  order: number;
  excerpt: string | null;
  content: string;
  status: string;
}

const emptyDraft = { title: "", category: "", categoryOrder: 0, order: 0, excerpt: "", content: "", status: "PUBLISHED" as "PUBLISHED" | "DRAFT" };

export function WikiAdmin({ initialArticles }: { initialArticles: Article[] }) {
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [editing, setEditing] = useState<Article | null>(null);
  const [draft, setDraft] = useState<typeof emptyDraft>(emptyDraft);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  function startCreate() {
    setEditing(null);
    setDraft(emptyDraft);
    setOpen(true);
  }
  function startEdit(a: Article) {
    setEditing(a);
    setDraft({ title: a.title, category: a.category, categoryOrder: a.categoryOrder, order: a.order, excerpt: a.excerpt ?? "", content: a.content, status: a.status as "PUBLISHED" | "DRAFT" });
    setOpen(true);
  }

  async function save() {
    if (!draft.title.trim() || !draft.category.trim()) return;
    setBusy(true);
    try {
      if (editing) {
        const updated = await updateArticle(editing.id, draft);
        setArticles((prev) => prev.map((x) => (x.id === editing.id ? (updated as unknown as Article) : x)));
      } else {
        const created = await createArticle(draft);
        setArticles((prev) => [...prev, created as unknown as Article]);
      }
      setOpen(false);
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm("Διαγραφή άρθρου;")) return;
    await deleteArticle(id);
    setArticles((prev) => prev.filter((x) => x.id !== id));
  }

  const categories = Array.from(new Set(articles.map((a) => a.category)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{articles.length} άρθρα</p>
        <div className="flex gap-2">
          <Link href="/wiki" className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-[#0078d4] hover:bg-blue-50">
            <ExternalLink className="h-4 w-4" /> Προβολή οδηγού
          </Link>
          <Button onClick={startCreate}><Plus className="mr-1.5 h-4 w-4" /> Νέο άρθρο</Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Τίτλος</th>
              <th className="px-4 py-2.5 font-medium">Κατηγορία</th>
              <th className="px-4 py-2.5 text-center font-medium">Σειρά</th>
              <th className="px-4 py-2.5 font-medium">Κατάσταση</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => (
              <tr key={a.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                <td className="px-4 py-3 font-medium text-neutral-800">{a.title}</td>
                <td className="px-4 py-3 text-neutral-600">{a.category}</td>
                <td className="px-4 py-3 text-center text-neutral-500">{a.categoryOrder}.{a.order}</td>
                <td className="px-4 py-3"><Badge variant={a.status === "PUBLISHED" ? "success" : "secondary"}>{a.status === "PUBLISHED" ? "Δημοσιευμένο" : "Προσχέδιο"}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => startEdit(a)} className="rounded p-1.5 text-neutral-400 hover:text-[#0078d4]" title="Επεξεργασία"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => remove(a.id)} className="rounded p-1.5 text-neutral-400 hover:text-red-600" title="Διαγραφή"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {articles.length === 0 && <tr><td className="px-4 py-10 text-center text-sm text-neutral-400" colSpan={5}>Δεν υπάρχουν άρθρα ακόμη.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Editor modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-3xl rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3">
              <h2 className="font-semibold text-neutral-800">{editing ? "Επεξεργασία άρθρου" : "Νέο άρθρο"}</h2>
              <button onClick={() => setOpen(false)} className="rounded p-1 text-neutral-400 hover:text-neutral-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">Τίτλος</label>
                  <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Τίτλος άρθρου" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">Κατηγορία</label>
                  <Input list="wiki-cats" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="π.χ. Συναινέσεις" />
                  <datalist id="wiki-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">Σειρά κατηγορίας</label>
                  <Input type="number" value={draft.categoryOrder} onChange={(e) => setDraft({ ...draft, categoryOrder: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">Σειρά άρθρου</label>
                  <Input type="number" value={draft.order} onChange={(e) => setDraft({ ...draft, order: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">Κατάσταση</label>
                  <select className="h-9 w-full rounded-md border border-neutral-200 bg-white px-2 text-sm" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as "PUBLISHED" | "DRAFT" })}>
                    <option value="PUBLISHED">Δημοσιευμένο</option>
                    <option value="DRAFT">Προσχέδιο</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Σύνοψη (excerpt)</label>
                <Input value={draft.excerpt} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} placeholder="Μία πρόταση περίληψης" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Περιεχόμενο</label>
                <RichTextEditor value={draft.content} onChange={(html) => setDraft({ ...draft, content: html })} placeholder="Γράψτε την τεκμηρίωση…" minHeight={340} />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-neutral-100 px-5 py-3">
              <Button variant="outline" onClick={() => setOpen(false)}>Άκυρο</Button>
              <Button onClick={save} disabled={busy || !draft.title.trim() || !draft.category.trim()}>
                {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                {editing ? "Αποθήκευση" : "Δημιουργία"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
