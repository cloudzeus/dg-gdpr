"use client";

import { useState, useTransition } from "react";
import { updateUserRole } from "@/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { FiCheck } from "react-icons/fi";

const ROLES = [
  { value: "ADMIN", label: "Διαχειριστής" },
  { value: "DPO", label: "ΥΠΔ (DPO)" },
  { value: "DEVELOPER", label: "Προγραμματιστής" },
  { value: "USER", label: "Χρήστης" },
];

const ROLE_VARIANT: Record<string, "default" | "success" | "warning" | "secondary"> = {
  ADMIN: "default",
  DPO: "success",
  DEVELOPER: "warning",
  USER: "secondary",
};

export function UserRoleEditor({ userId, currentRole }: { userId: string; currentRole: string }) {
  const [role, setRole] = useState(currentRole);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleChange = (newRole: string) => {
    setRole(newRole);
    setSaved(false);
    startTransition(async () => {
      await updateUserRole(userId, newRole);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={role}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
        className="text-xs w-40"
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </Select>
      {saved && <FiCheck className="h-4 w-4 text-green-600" />}
    </div>
  );
}
