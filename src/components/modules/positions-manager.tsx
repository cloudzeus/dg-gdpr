"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { CommandBar, CommandBarButton, CommandBarSeparator } from "@/components/shared/command-bar";
import { createPosition, updatePosition, deletePosition } from "@/actions/positions";
import { Plus, Pencil, Trash2, Star, Search } from "lucide-react";

type Position = {
  id: string;
  title: string;
  code: string | null;
  description: string | null;
  isKeyRole: boolean;
  userCount: number;
};

export function PositionsManager({ positions }: { positions: Position[] }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Position | null>(null);
  const [creating, setCreating] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = positions.filter(
    (p) =>
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      (p.code ?? "").toLowerCase().includes(query.toLowerCase())
  );

  const handleSubmit = (id: string | null) => async (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        if (id) await updatePosition(id, formData);
        else await createPosition(formData);
        setEditing(null);
        setCreating(false);
      } catch (e: any) {
        setError(e.message ?? "Σφάλμα");
      }
    });
  };

  const handleDelete = (p: Position) => {
    if (!confirm(`Διαγραφή θέσης "${p.title}";`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deletePosition(p.id);
      } catch (e: any) {
        setError(e.message ?? "Σφάλμα");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 justify-between">
        <CommandBar>
          <CommandBarButton icon={Plus} label="Νέα Θέση" variant="primary" onClick={() => setCreating(true)} />
          <CommandBarSeparator />
          <div className="flex items-center gap-1.5 px-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Αναζήτηση..."
              className="w-44 bg-transparent text-xs outline-none"
            />
          </div>
        </CommandBar>
        <span className="text-xs text-muted-foreground">{filtered.length} / {positions.length}</span>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-xs uppercase text-muted-foreground">
                <th className="px-4 py-2 text-left font-semibold">Τίτλος</th>
                <th className="px-4 py-2 text-left font-semibold">Κωδικός</th>
                <th className="px-4 py-2 text-left font-semibold">Περιγραφή</th>
                <th className="px-4 py-2 text-center font-semibold">Χρήστες</th>
                <th className="px-4 py-2 text-right font-semibold">Ενέργειες</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border hover:bg-secondary/30">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {p.isKeyRole && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-400" />}
                      <span className="font-medium">{p.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{p.code ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-xs">{p.description ?? "—"}</td>
                  <td className="px-4 py-2.5 text-center">
                    <Badge variant="secondary">{p.userCount}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(p)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Modal
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? "Επεξεργασία Θέσης" : "Νέα Θέση"}
      >
        <form action={handleSubmit(editing?.id ?? null)} className="space-y-3">
          <Field label="Τίτλος *">
            <Input name="title" defaultValue={editing?.title ?? ""} required autoFocus />
          </Field>
          <Field label="Κωδικός (μοναδικός)">
            <Input name="code" defaultValue={editing?.code ?? ""} placeholder="π.χ. DPO" />
          </Field>
          <Field label="Περιγραφή">
            <textarea
              name="description"
              defaultValue={editing?.description ?? ""}
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isKeyRole" defaultChecked={editing?.isKeyRole ?? false} />
            Κρίσιμη θέση (Key GDPR Role)
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { setCreating(false); setEditing(null); }}>Ακύρωση</Button>
            <Button type="submit" disabled={isPending}>Αποθήκευση</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
