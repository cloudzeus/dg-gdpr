"use client";

import { useState, useTransition } from "react";
import { regenerateDpaWord } from "@/actions/dpia";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function DpaRegenButton({ contractId, currentUrl }: { contractId: string; currentUrl: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [url, setUrl] = useState<string | null>(currentUrl);
  const [error, setError] = useState<string | null>(null);

  function regen() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await regenerateDpaWord(contractId);
        setUrl(res.pdfUrl);
      } catch (e: any) {
        setError(e.message);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={regen} disabled={isPending} className="gap-1.5">
        <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
        {isPending ? "Δημιουργία..." : "Αναδημιουργία Word"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {url && !isPending && (
        <a href={url} target="_blank" rel="noreferrer" download className="text-xs text-primary hover:underline">
          Νέο αρχείο έτοιμο ↓
        </a>
      )}
    </div>
  );
}
