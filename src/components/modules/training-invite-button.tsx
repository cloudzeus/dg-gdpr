"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { TrainingNotifyModal } from "@/components/modules/training-notify-modal";

interface Department { id: string; name: string }
interface UserRow { id: string; name: string | null; email: string | null; departmentId: string | null }

interface Props {
  moduleId: string;
  moduleTitle: string;
  moduleDescription: string | null;
  departments: Department[];
  users: UserRow[];
}

export function TrainingInviteButton({ moduleId, moduleTitle, moduleDescription, departments, users }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
        title="Αποστολή πρόσκλησης εκπαίδευσης"
      >
        <Bell className="h-3.5 w-3.5 text-primary" />
        Αποστολή Πρόσκλησης
      </Button>
      <TrainingNotifyModal
        open={open}
        onClose={() => setOpen(false)}
        moduleId={moduleId}
        moduleTitle={moduleTitle}
        moduleDescription={moduleDescription}
        departments={departments}
        users={users}
      />
    </>
  );
}
