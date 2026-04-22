"use client";

import { useState, useTransition, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { CommandBar, CommandBarButton, CommandBarSeparator } from "@/components/shared/command-bar";
import { createUser, updateUser, deleteUser } from "@/actions/users-admin";
import { Plus, Pencil, Trash2, Search, Lock, User as UserIcon } from "lucide-react";

type AppUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  phone: string | null;
  isActive: boolean;
  departmentId: string | null;
  departmentName: string | null;
  positionId: string | null;
  positionTitle: string | null;
};

const ROLES: Array<{ value: string; label: string }> = [
  { value: "ADMIN", label: "Διαχειριστής" },
  { value: "DPO", label: "ΥΠΔ (DPO)" },
  { value: "SECURITY_OFFICER", label: "Υπεύθ. Ασφαλείας" },
  { value: "COMPLIANCE_OFFICER", label: "Υπεύθ. Συμμόρφωσης" },
  { value: "IT_MANAGER", label: "IT Manager" },
  { value: "HR_MANAGER", label: "HR Manager" },
  { value: "DEVELOPER", label: "Developer" },
  { value: "USER", label: "Χρήστης" },
];

const ROLE_VARIANT: Record<string, "default" | "success" | "warning" | "secondary"> = {
  ADMIN: "default", DPO: "success", SECURITY_OFFICER: "warning",
  COMPLIANCE_OFFICER: "success", IT_MANAGER: "default",
  HR_MANAGER: "default", DEVELOPER: "warning", USER: "secondary",
};

export function UsersManager({
  users,
  departments,
  positions,
  currentUserId,
}: {
  users: AppUser[];
  departments: { id: string; name: string }[];
  positions: { id: string; title: string }[];
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.name ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.departmentName ?? "").toLowerCase().includes(q) ||
        (u.positionTitle ?? "").toLowerCase().includes(q)
    );
  }, [users, query]);

  const handleSubmit = (id: string | null) => async (fd: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        if (id) await updateUser(id, fd);
        else await createUser(fd);
        setEditing(null);
        setCreating(false);
      } catch (e: any) {
        setError(e.message ?? "Σφάλμα");
      }
    });
  };

  const handleDelete = (u: AppUser) => {
    if (!confirm(`Απενεργοποίηση χρήστη "${u.name ?? u.email}";`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteUser(u.id);
      } catch (e: any) {
        setError(e.message ?? "Σφάλμα");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <CommandBar>
          <CommandBarButton icon={Plus} label="Νέος Χρήστης" variant="primary" onClick={() => setCreating(true)} />
          <CommandBarSeparator />
          <div className="flex items-center gap-1.5 px-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Αναζήτηση..."
              className="w-48 bg-transparent text-xs outline-none"
            />
          </div>
        </CommandBar>
        <span className="text-xs text-muted-foreground">{filtered.length} / {users.length}</span>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-xs uppercase text-muted-foreground">
                <th className="px-4 py-2 text-left font-semibold">Όνομα</th>
                <th className="px-4 py-2 text-left font-semibold">Email</th>
                <th className="px-4 py-2 text-left font-semibold">Ρόλος</th>
                <th className="px-4 py-2 text-left font-semibold">Τμήμα / Θέση</th>
                <th className="px-4 py-2 text-center font-semibold">Ενεργός</th>
                <th className="px-4 py-2 text-right font-semibold">Ενέργειες</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-border hover:bg-secondary/30">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {u.image ? (
                        <img src={u.image} alt="" className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {(u.name ?? u.email ?? "?")[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium">{u.name ?? "—"}</span>
                      {u.id === currentUserId && <Lock className="h-3 w-3 text-muted-foreground" />}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={ROLE_VARIANT[u.role] ?? "secondary"}>
                      {ROLES.find((r) => r.value === u.role)?.label ?? u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {u.positionTitle && <div>{u.positionTitle}</div>}
                    {u.departmentName && <div className="text-muted-foreground">{u.departmentName}</div>}
                    {!u.positionTitle && !u.departmentName && <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {u.isActive ? (
                      <Badge variant="success">✓</Badge>
                    ) : (
                      <Badge variant="secondary">ανενεργός</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(u)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {u.id !== currentUserId && (
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(u)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
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
        onClose={() => { setCreating(false); setEditing(null); }}
        title={editing ? "Επεξεργασία Χρήστη" : "Νέος Χρήστης"}
      >
        <form action={handleSubmit(editing?.id ?? null)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ονοματεπώνυμο">
              <Input name="name" defaultValue={editing?.name ?? ""} autoFocus />
            </Field>
            <Field label="Email *">
              <Input name="email" type="email" defaultValue={editing?.email ?? ""} required disabled={!!editing} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ρόλος *">
              <select name="role" defaultValue={editing?.role ?? "USER"} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
            <Field label="Τηλέφωνο">
              <Input name="phone" defaultValue={editing?.phone ?? ""} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Τμήμα">
              <select name="departmentId" defaultValue={editing?.departmentId ?? ""} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option value="">— Κανένα —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Θέση">
              <select name="positionId" defaultValue={editing?.positionId ?? ""} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option value="">— Καμία —</option>
                {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Διεύθυνση">
            <Input name="address" defaultValue="" />
          </Field>
          <Field label={editing ? "Νέος Κωδικός (αφήστε κενό για διατήρηση)" : "Κωδικός *"}>
            <Input name="password" type="password" required={!editing} minLength={editing ? 0 : 8} />
          </Field>
          {editing && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={editing.isActive} />
              Ενεργός χρήστης
            </label>
          )}
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
