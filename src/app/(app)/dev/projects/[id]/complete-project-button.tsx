"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { completeProject } from "@/actions/signature";
import { CheckCircle2, Loader2 } from "lucide-react";

export function CompleteProjectButton({
  projectId,
  allowed,
  reasons,
}: {
  projectId: string;
  allowed: boolean;
  reasons: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleComplete() {
    if (!window.confirm("Οριστικό κλείσιμο του έργου;")) return;
    setError(null);
    startTransition(async () => {
      try {
        await completeProject(projectId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Σφάλμα");
      }
    });
  }

  return (
    <div className="space-y-3">
      {reasons.length > 0 && (
        <ul className="space-y-1.5 rounded-lg border border-[#F7D26A] bg-[#FFF4CE] p-3 text-sm text-[#7A5B00]">
          {reasons.map((r, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button className="gap-2" disabled={!allowed || isPending} onClick={handleComplete}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {isPending ? "Κλείσιμο…" : "Κλείσιμο έργου"}
      </Button>
    </div>
  );
}
