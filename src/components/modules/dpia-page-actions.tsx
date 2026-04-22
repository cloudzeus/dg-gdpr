"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DpiaCreateModal } from "./dpia-create-modal";
import { DpaCreateModal } from "./dpa-create-modal";
import { FiPlus, FiDownload } from "react-icons/fi";

interface Project {
  id: string;
  name: string;
  description?: string | null;
}

interface DpaContractRow {
  id: string;
}

export function DpiaPageActions({ projects }: { projects: Project[] }) {
  const [dpiaOpen, setDpiaOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setDpiaOpen(true)} className="gap-2">
        <FiPlus className="h-4 w-4" /> Νέα DPIA
      </Button>
      <DpiaCreateModal open={dpiaOpen} onClose={() => setDpiaOpen(false)} projects={projects} />
    </>
  );
}

export function DpaPageActions({ projects }: { projects: Project[] }) {
  const [dpaOpen, setDpaOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setDpaOpen(true)} className="gap-2">
        <FiPlus className="h-4 w-4" /> Νέα Σύμβαση DPA
      </Button>
      <DpaCreateModal open={dpaOpen} onClose={() => setDpaOpen(false)} projects={projects} />
    </>
  );
}

export function DpaWordExportButton({ contractId }: { contractId: string }) {
  return (
    <a href={`/api/export/dpa?id=${contractId}`} download>
      <Button variant="outline" size="sm" className="gap-1.5">
        <FiDownload className="h-3.5 w-3.5" /> Word
      </Button>
    </a>
  );
}
