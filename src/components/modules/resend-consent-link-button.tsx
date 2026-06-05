"use client";

import { useState, useTransition } from "react";
import { Send, Check } from "lucide-react";
import { resendConsentLink } from "@/actions/consent";

export function ResendConsentLinkButton({ recordId }: { recordId: string }) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        await resendConsentLink(recordId);
        setDone(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Σφάλμα αποστολής");
      }
    });
  };

  return (
    <div className="flex flex-col items-start gap-0.5">
      <button
        onClick={onClick}
        disabled={isPending || done}
        title="Επαναποστολή συνδέσμου επιβεβαίωσης"
        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-[#0078d4] hover:bg-neutral-50 disabled:opacity-60"
      >
        {done ? (
          <><Check className="h-3.5 w-3.5" /> Στάλθηκε</>
        ) : (
          <><Send className="h-3.5 w-3.5" /> {isPending ? "Αποστολή…" : "Resend link"}</>
        )}
      </button>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </div>
  );
}
