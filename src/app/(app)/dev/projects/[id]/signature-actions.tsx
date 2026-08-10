"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  sendSignatureRequest,
  resendSignatureRequest,
  cancelSignatureRequest,
  updateSignatureRecipientEmail,
} from "@/actions/signature";
import { Send, RotateCw, Ban, Download, Loader2 } from "lucide-react";

interface Props {
  requestId: string;
  status: string;
  hasEmail: boolean;
  uploadedUrl: string | null;
  /** Μη-null όταν η `SIGNATURE_TEST_RECIPIENT` είναι ενεργή — υπολογισμένο server-side. */
  testRecipient: string | null;
}

const TERMINAL = new Set(["SIGNED", "DECLINED", "EXPIRED"]);

export function SignatureRowActions({ requestId, status, hasEmail, uploadedUrl, testRecipient }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState("");
  const [editingEmail, setEditingEmail] = useState(false);

  function run(action: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Σφάλμα");
      }
    });
  }

  function handleSend() {
    run(() => sendSignatureRequest(requestId));
  }

  function handleResend() {
    run(() => resendSignatureRequest(requestId));
  }

  function handleCancel() {
    const reason = window.prompt("Λόγος ακύρωσης του αιτήματος υπογραφής;");
    if (reason == null) return;
    if (!reason.trim()) { setError("Η ακύρωση απαιτεί αιτιολογία"); return; }
    run(() => cancelSignatureRequest(requestId, reason));
  }

  function handleSaveEmail() {
    if (!emailDraft.trim()) return;
    run(async () => {
      await updateSignatureRecipientEmail(requestId, emailDraft);
      setEditingEmail(false);
    });
  }

  if (TERMINAL.has(status)) {
    return (
      <div className="flex items-center justify-end gap-2">
        {uploadedUrl && (
          <a href={uploadedUrl} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
              <Download className="h-3 w-3" /> Υπογεγραμμένο
            </Button>
          </a>
        )}
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    );
  }

  // Χωρίς email παραλήπτη — η αποστολή είναι μπλοκαρισμένη μέχρι να συμπληρωθεί.
  if (!hasEmail && !editingEmail) {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-destructive">Λείπει email</span>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditingEmail(true)}>
          Συμπλήρωση
        </Button>
      </div>
    );
  }

  if (editingEmail) {
    return (
      <div className="flex items-center justify-end gap-2">
        <input
          type="email"
          autoFocus
          value={emailDraft}
          onChange={(e) => setEmailDraft(e.target.value)}
          placeholder="email@example.com"
          className="h-7 w-44 rounded border border-border px-2 text-xs"
        />
        <Button size="sm" className="h-7 text-xs" disabled={isPending} onClick={handleSaveEmail}>
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Αποθήκευση"}
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingEmail(false)}>
          Άκυρο
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-2">
        {status === "PENDING" ? (
          <Button size="sm" className="gap-1.5 h-7 text-xs" disabled={isPending} onClick={handleSend}>
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            {testRecipient ? `Αποστολή (δοκιμαστικά σε ${testRecipient})` : "Αποστολή"}
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" disabled={isPending} onClick={handleResend}>
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCw className="h-3 w-3" />}
            {testRecipient ? `Επαναποστολή (δοκιμαστικά σε ${testRecipient})` : "Επαναποστολή"}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
          disabled={isPending}
          onClick={handleCancel}
        >
          <Ban className="h-3 w-3" /> Ακύρωση
        </Button>
      </div>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
