"use client";

import { useState, useTransition, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { CommandBar, CommandBarButton } from "@/components/shared/command-bar";
import { createDepartment, updateDepartment, deleteDepartment } from "@/actions/departments";
import { Plus, Pencil, Trash2, Users, ChevronRight, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

type Dept = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  parentId: string | null;
  managerId: string | null;
  managerName: string | null;
  memberCount: number;
  childCount: number;
};

type UserOption = { id: string; label: string };

export function DepartmentsManager({
  departments,
  users,
}: {
  departments: Dept[];
  users: UserOption[];
}) {
  const [editing, setEditing] = useState<Dept | null>(null);
  const [creating, setCreating] = useState<{ parentId: string | null } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const byParent = useMemo(() => {
    const map = new Map<string | null, Dept[]>();
    for (const d of departments) {
      const key = d.parentId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return map;
  }, [departments]);

  const handleSubmit = (id: string | null, parentId: string | null) => async (fd: FormData) => {
    if (parentId && !fd.get("parentId")) fd.set("parentId", parentId);
    setError(null);
    startTransition(async () => {
      try {
        if (id) await updateDepartment(id, fd);
        else await createDepartment(fd);
        setEditing(null);
        setCreating(null);
      } catch (e: any) {
        setError(e.message ?? "Σφάλμα");
      }
    });
  };

  const handleDelete = (d: Dept) => {
    if (!confirm(`Διαγραφή τμήματος "${d.name}";`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteDepartment(d.id);
      } catch (e: any) {
        setError(e.message ?? "Σφάλμα");
      }
    });
  };

  const renderNode = (d: Dept, depth: number) => {
    const children = byParent.get(d.id) ?? [];
    return (
      <div key={d.id}>
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-3 rounded-md hover:bg-secondary/40 group",
            depth === 0 && "bg-secondary/20"
          )}
          style={{ paddingLeft: `${12 + depth * 20}px` }}
        >
          {children.length > 0 ? (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground rotate-90" />
          ) : (
            <span className="w-3.5" />
          )}
          <GitBranch className="h-3.5 w-3.5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {d.name}
              {d.code && <span className="ml-2 text-xs text-muted-foreground">({d.code})</span>}
            </p>
            {d.description && <p className="text-xs text-muted-foreground truncate">{d.description}</p>}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
            {d.managerName && <span>👤 {d.managerName}</span>}
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {d.memberCount}</span>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button variant="ghost" size="sm" onClick={() => setCreating({ parentId: d.id })} title="Νέο υποτμήμα">
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(d)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(d)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>
        {children.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  const roots = byParent.get(null) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <CommandBar>
          <CommandBarButton icon={Plus} label="Νέο Τμήμα (Root)" variant="primary" onClick={() => setCreating({ parentId: null })} />
        </CommandBar>
        <span className="text-xs text-muted-foreground">{departments.length} τμήματα</span>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="p-2">
          {roots.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Δεν υπάρχουν τμήματα</p>
          ) : (
            roots.map((r) => renderNode(r, 0))
          )}
        </CardContent>
      </Card>

      <Modal
        open={editing !== null || creating !== null}
        onClose={() => { setEditing(null); setCreating(null); }}
        title={editing ? "Επεξεργασία Τμήματος" : "Νέο Τμήμα"}
      >
        <form action={handleSubmit(editing?.id ?? null, creating?.parentId ?? null)} className="space-y-3">
          <Field label="Όνομα *">
            <Input name="name" defaultValue={editing?.name ?? ""} required autoFocus />
          </Field>
          <Field label="Κωδικός (μοναδικός)">
            <Input name="code" defaultValue={editing?.code ?? ""} />
          </Field>
          <Field label="Γονικό Τμήμα">
            <select
              name="parentId"
              defaultValue={editing?.parentId ?? creating?.parentId ?? ""}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">— Κανένα (root) —</option>
              {departments
                .filter((d) => d.id !== editing?.id)
                .map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
            </select>
          </Field>
          <Field label="Υπεύθυνος Τμήματος">
            <select
              name="managerId"
              defaultValue={editing?.managerId ?? ""}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">— Κανένας —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Περιγραφή">
            <textarea name="description" defaultValue={editing?.description ?? ""} rows={2}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { setEditing(null); setCreating(null); }}>Ακύρωση</Button>
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
