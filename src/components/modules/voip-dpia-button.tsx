"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DpiaCreateModal } from "@/components/modules/dpia-create-modal";
import { FileText } from "lucide-react";

interface Project { id: string; name: string; description?: string | null }

interface Props {
  projects: Project[];
  prefillTitle: string;
  prefillPurpose: string;
  prefillDataObjects: string[];
  prefillRisks: string[];
}

export function VoipDpiaButton({ projects, prefillTitle, prefillPurpose, prefillDataObjects, prefillRisks }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="gap-2 shrink-0">
        <FileText className="h-4 w-4" /> Δημιουργία DPIA
      </Button>
      <DpiaCreateModal
        open={open}
        onClose={() => setOpen(false)}
        projects={projects}
        prefillTitle={prefillTitle}
        prefillPurpose={prefillPurpose}
        prefillDataObjects={prefillDataObjects}
        prefillRisks={prefillRisks}
      />
    </>
  );
}
