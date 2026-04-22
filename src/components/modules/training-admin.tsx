"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { CommandBar, CommandBarButton, CommandBarSeparator } from "@/components/shared/command-bar";
import { createModule, deleteModule } from "@/actions/training-admin";
import { Plus, Trash2, GraduationCap, Settings2, History, Users } from "lucide-react";

type Module = {
  id: string;
  title: string;
  description: string | null;
  passingScore: number;
  durationMin: number;
  targetRole: string | null;
  isActive: boolean;
  sectionCount: number;
  questionCount: number;
  resultCount: number;
};

type HistoryRow = {
  id: string;
  userName: string;
  userEmail: string | null;
  moduleTitle: string;
  passingScore: number;
  score: number;
  passed: boolean;
  completedAt: string;
  retryCount: number;
};

export function TrainingAdmin({
  modules,
  history,
}: {
  modules: Module[];
  history: HistoryRow[];
}) {
  const [tab, setTab] = useState<"modules" | "history">("modules");
  const [creating, setCreating] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (fd: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        await createModule(fd);
        setCreating(false);
      } catch (e: any) {
        setError(e.message ?? "Σφάλμα");
      }
    });
  };

  const handleDelete = (m: Module) => {
    if (!confirm(`Διαγραφή ενότητας "${m.title}" και όλων των δεδομένων της;`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteModule(m.id);
      } catch (e: any) {
        setError(e.message ?? "Σφάλμα");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b border-border">
        <TabBtn active={tab === "modules"} onClick={() => setTab("modules")} icon={Settings2}>
          Ενότητες
        </TabBtn>
        <TabBtn active={tab === "history"} onClick={() => setTab("history")} icon={History}>
          Ιστορικό Βαθμολογιών ({history.length})
        </TabBtn>
      </div>

      {tab === "modules" && (
        <>
          <div className="flex items-center justify-between">
            <CommandBar>
              <CommandBarButton icon={Plus} label="Νέα Ενότητα" variant="primary" onClick={() => setCreating(true)} />
              <CommandBarSeparator />
              <span className="px-2 text-xs text-muted-foreground">{modules.length} ενότητες</span>
            </CommandBar>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            {modules.map((m) => (
              <Card key={m.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{m.title}</h3>
                        {!m.isActive && <Badge variant="secondary">ανενεργή</Badge>}
                      </div>
                      {m.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{m.description}</p>}
                      <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{m.sectionCount} ενότητες</span>
                        <span>{m.questionCount} ερωτήσεις</span>
                        <span><Users className="h-3 w-3 inline mr-0.5" />{m.resultCount} αποτελέσματα</span>
                        <span>⏱️ {m.durationMin}'</span>
                        <span>✓ {m.passingScore}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                    <Link href={`/admin/training/${m.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">Επεξεργασία περιεχομένου</Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(m)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === "history" && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-xs uppercase text-muted-foreground">
                  <th className="px-4 py-2 text-left font-semibold">Εργαζόμενος</th>
                  <th className="px-4 py-2 text-left font-semibold">Ενότητα</th>
                  <th className="px-4 py-2 text-center font-semibold">Βαθμός</th>
                  <th className="px-4 py-2 text-center font-semibold">Κατάσταση</th>
                  <th className="px-4 py-2 text-center font-semibold">Προσπάθεια</th>
                  <th className="px-4 py-2 text-right font-semibold">Ημερομηνία</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Δεν υπάρχουν αποτελέσματα</td></tr>
                ) : history.map((h) => (
                  <tr key={h.id} className="border-b border-border hover:bg-secondary/30">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{h.userName}</p>
                      {h.userEmail && <p className="text-xs text-muted-foreground">{h.userEmail}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-xs">{h.moduleTitle}</td>
                    <td className="px-4 py-2.5 text-center font-semibold">
                      <span className={h.passed ? "text-green-600" : "text-red-600"}>
                        {Math.round(h.score)}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {h.passed ? <Badge variant="success">Πέρασε</Badge> : <Badge variant="warning">Απέτυχε</Badge>}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs">#{h.retryCount + 1}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                      {new Date(h.completedAt).toLocaleString("el-GR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Νέα Ενότητα Εκπαίδευσης">
        <form action={handleCreate} className="space-y-3">
          <Field label="Τίτλος *"><Input name="title" required autoFocus /></Field>
          <Field label="Περιγραφή">
            <textarea name="description" rows={3} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Διάρκεια (min)"><Input name="durationMin" type="number" defaultValue="30" /></Field>
            <Field label="Ελάχ. Βαθμός (%)"><Input name="passingScore" type="number" defaultValue="70" /></Field>
            <Field label="Target Ρόλος">
              <select name="targetRole" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option value="">Όλοι</option>
                <option value="ADMIN">Admin</option>
                <option value="DPO">DPO</option>
                <option value="DEVELOPER">Developer</option>
                <option value="USER">User</option>
              </select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setCreating(false)}>Ακύρωση</Button>
            <Button type="submit" disabled={isPending}>Δημιουργία</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function TabBtn({
  active, onClick, icon: Icon, children,
}: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
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
