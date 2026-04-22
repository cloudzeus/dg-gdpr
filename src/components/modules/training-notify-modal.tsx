"use client";

import { useState, useTransition } from "react";
import { sendTrainingNotification } from "@/actions/training-notify";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Bell, CheckCircle2, Users, Building2, User } from "lucide-react";
import { Loader2 } from "lucide-react";

interface Department { id: string; name: string }
interface UserRow { id: string; name: string | null; email: string | null; departmentId: string | null }

interface Props {
  open: boolean;
  onClose: () => void;
  moduleId: string;
  moduleTitle: string;
  moduleDescription: string | null;
  departments: Department[];
  users: UserRow[];
}

type TargetType = "all" | "department" | "users";

export function TrainingNotifyModal({
  open, onClose, moduleId, moduleTitle, moduleDescription, departments, users,
}: Props) {
  const [targetType, setTargetType] = useState<TargetType>("all");
  const [departmentId, setDepartmentId] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState(
    `Σας ενημερώνουμε ότι απαιτείται η ολοκλήρωση της ενότητας εκπαίδευσης GDPR «${moduleTitle}». Παρακαλούμε συνδεθείτε στην πλατφόρμα, μελετήστε το περιεχόμενο και ολοκληρώστε το τεστ αξιολόγησης.`
  );
  const [deadline, setDeadline] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ sent: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredUsers = departmentId
    ? users.filter((u) => u.departmentId === departmentId)
    : users;

  function toggleUser(id: string) {
    setSelectedUsers((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function handleSend() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await sendTrainingNotification({
          moduleId,
          targetType,
          departmentId: targetType === "department" ? departmentId : null,
          userIds: targetType === "users" ? selectedUsers : undefined,
          customMessage,
          deadline: deadline || null,
        });
        setResult(res);
      } catch (e: any) {
        setError(e.message);
      }
    });
  }

  if (result) {
    return (
      <Modal open={open} onClose={onClose} title="Ειδοποίηση Απεστάλη" size="sm">
        <div className="text-center space-y-4 py-6">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
          <p className="font-semibold text-lg">Οι ειδοποιήσεις στάλθηκαν!</p>
          <p className="text-sm text-muted-foreground">
            <strong>{result.sent}</strong> email εστάλη επιτυχώς
            {result.skipped > 0 && ` · ${result.skipped} χωρίς email`}
          </p>
          <Button onClick={onClose} className="w-full">Κλείσιμο</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Ειδοποίηση για: ${moduleTitle}`}
      description="Αποστολή email σε χρήστες για να ολοκληρώσουν την εκπαίδευση"
      size="lg"
    >
      <div className="space-y-5">

        {/* Target selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Αποδέκτες</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { v: "all", label: "Όλοι οι χρήστες", Icon: Users },
              { v: "department", label: "Τμήμα", Icon: Building2 },
              { v: "users", label: "Συγκεκριμένοι", Icon: User },
            ] as const).map(({ v, label, Icon }) => (
              <button
                key={v}
                type="button"
                onClick={() => setTargetType(v)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                  targetType === v
                    ? "border-primary bg-primary text-white"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Department picker */}
        {targetType === "department" && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Επιλογή Τμήματος</label>
            <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">-- Επιλέξτε τμήμα --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </div>
        )}

        {/* User picker */}
        {targetType === "users" && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Επιλογή Χρηστών ({selectedUsers.length} επιλεγμένοι)</label>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {users.map((u) => (
                <label key={u.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-secondary/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(u.id)}
                    onChange={() => toggleUser(u.id)}
                    className="rounded"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.name ?? u.email ?? u.id}</p>
                    {u.email && <p className="text-xs text-muted-foreground truncate">{u.email}</p>}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Custom message */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Μήνυμα προς χρήστες</label>
          <Textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={4}
          />
        </div>

        {/* Deadline */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Προθεσμία (προαιρετικό)</label>
          <Input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>

        {/* Email preview info */}
        <div
          className="rounded-lg p-3 text-xs space-y-1"
          style={{ background: "rgba(0,120,212,0.06)", border: "1px solid rgba(0,120,212,0.18)" }}
        >
          <p className="font-semibold" style={{ color: "#0078d4" }}>Το email θα περιλαμβάνει:</p>
          <p className="text-muted-foreground">✓ Τίτλο & περιγραφή ενότητας: <strong>{moduleTitle}</strong></p>
          {moduleDescription && <p className="text-muted-foreground">✓ {moduleDescription}</p>}
          <p className="text-muted-foreground">✓ Σύνοψη κάθε υποενότητας</p>
          <p className="text-muted-foreground">✓ Κουμπί σύνδεσης & έναρξης εκπαίδευσης</p>
          <p className="text-muted-foreground">✓ Υπενθύμιση GDPR υποχρέωσης (Άρθρο 39)</p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1">Ακύρωση</Button>
          <Button
            onClick={handleSend}
            disabled={
              isPending ||
              (targetType === "department" && !departmentId) ||
              (targetType === "users" && selectedUsers.length === 0)
            }
            className="flex-1 gap-2"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            {isPending ? "Αποστολή..." : "Αποστολή Ειδοποίησης"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
