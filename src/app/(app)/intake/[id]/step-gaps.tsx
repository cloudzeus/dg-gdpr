// src/app/(app)/intake/[id]/step-gaps.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShieldAlert, CheckCircle2, ClipboardCheck, ClipboardCopy } from "lucide-react";
import { setGapStatus } from "@/actions/intake";
import { executeAllRemedies, setDpaForm } from "@/actions/remedy";
import type { getIntakeDetail } from "@/actions/intake-ui";
import type { RemedyResult } from "@/lib/remedy/types";

type Intake = Awaited<ReturnType<typeof getIntakeDetail>>["intake"];
type Gap = Intake["gaps"][number];

const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const SEVERITY_LABEL: Record<string, { text: string; variant: "destructive" | "warning" | "default" | "secondary" }> = {
  CRITICAL: { text: "Κρίσιμο", variant: "destructive" },
  HIGH: { text: "Υψηλό", variant: "warning" },
  MEDIUM: { text: "Μεσαίο", variant: "default" },
  LOW: { text: "Χαμηλό", variant: "secondary" },
};

const CATEGORY_LABEL: Record<string, string> = {
  POLICY: "Πολιτική",
  DPIA: "DPIA",
  ROPA: "RoPA",
  TRAINING: "Εκπαίδευση",
  TECHNICAL: "Τεχνικό μέτρο",
  CONTRACT: "Σύμβαση",
  DPO: "DPO",
};

const REMEDY_LABEL: Record<string, string> = {
  CREATE_POLICY: "Δημιουργία πολιτικής",
  CREATE_DPIA: "Δημιουργία DPIA",
  CREATE_DPA: "Δημιουργία DPA",
  CREATE_CONTRACT_CLAUSES: "Ρήτρες μέσα στη σύμβαση",
  CREATE_JCA: "Δημιουργία JCA",
  CREATE_ROPA_ENTRY: "Καταχώριση RoPA",
  CREATE_ASSESSMENT: "Νέα αξιολόγηση",
  ASSIGN_DPO: "Ορισμός DPO",
  CREATE_TRAINING: "Εκπαίδευση προσωπικού",
};

const STATUS_LABEL: Record<string, { text: string; variant: "warning" | "default" | "success" | "secondary" }> = {
  OPEN: { text: "Ανοιχτό", variant: "warning" },
  DRAFTED: { text: "Σε πρόχειρο", variant: "default" },
  RESOLVED: { text: "Καλύφθηκε", variant: "success" },
  DISMISSED: { text: "Δεν ισχύει", variant: "secondary" },
};

// Μόνο οι εκτελεστές που καλούν το DeepSeek είναι πραγματικά αργοί (10-30δ) —
// οι υπόλοιποι (ρήτρες, DPA, RoPA, DPO κ.λπ.) τρέχουν σχεδόν ακαριαία.
const AI_REMEDY_TYPES = new Set(["CREATE_DPIA", "CREATE_POLICY"]);
const DPA_FORM_TYPES = new Set(["CREATE_DPA", "CREATE_CONTRACT_CLAUSES"]);

function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds} δευτερόλεπτα`;
  const minutes = Math.ceil(totalSeconds / 60);
  return `${minutes} ${minutes === 1 ? "λεπτό" : "λεπτά"}`;
}

/** Το `remedyPayload` των ρητρών είναι `{ text, fileUrl }` — βλ. src/lib/remedy/dpa.ts. */
function extractClauseText(payload: unknown): string | null {
  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    typeof (payload as Record<string, unknown>).text === "string"
  ) {
    return (payload as { text: string }).text;
  }
  return null;
}

/** Βήμα 5: τα κενά συμμόρφωσης — τα κρίσιμα πάντα πάνω, ποτέ κρυμμένα. */
export function StepGaps({ intake }: { intake: Intake }) {
  const router = useRouter();
  const [runningAll, setRunningAll] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [runError, setRunError] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, RemedyResult>>({});

  const sorted = [...intake.gaps].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
  );

  // Ζωντανός χρόνος όσο τρέχει η «Κάλυψη όλων» — για να μην απορεί ο χρήστης
  // αν έχει κολλήσει κάτι που απλώς είναι αργό.
  useEffect(() => {
    if (!runningAll) return;
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.round((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [runningAll]);

  async function runAll() {
    setRunError(null);
    setElapsed(0);
    setRunningAll(true);
    try {
      const res = await executeAllRemedies(intake.id);
      setResults((prev) => ({ ...prev, ...res }));
      router.refresh();
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Σφάλμα κατά την εκτέλεση της κάλυψης.");
    } finally {
      setRunningAll(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" /> Κενά Συμμόρφωσης
        </CardTitle>
        <CardDescription>
          Ταξινομημένα κατά σοβαρότητα. Ένα ανοιχτό κρίσιμο κενό μπλοκάρει την ολοκλήρωση.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CoverAllPanel gaps={sorted} running={runningAll} elapsed={elapsed} error={runError} onRun={runAll} />
        <ul className="space-y-3 mt-3">
          {sorted.map((g) => (
            <GapRow key={g.id} gap={g} result={results[g.id]} locked={runningAll} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function CoverAllPanel({
  gaps,
  running,
  elapsed,
  error,
  onRun,
}: {
  gaps: Gap[];
  running: boolean;
  elapsed: number;
  error: string | null;
  onRun: () => void;
}) {
  const remaining = gaps.filter((g) => !g.createdEntityId && !!g.remedyType);
  const aiCount = remaining.filter((g) => AI_REMEDY_TYPES.has(g.remedyType as string)).length;

  if (remaining.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Δεν εκκρεμούν κενά με προτεινόμενη κάλυψη.
      </p>
    );
  }

  return (
    <div className="rounded-sm border p-3 space-y-2" style={{ background: "rgba(0,120,212,0.04)", borderColor: "rgba(0,120,212,0.25)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Κάλυψη όλων</p>
          <p className="text-xs text-muted-foreground">
            Τρέχει σειριακά, ένα κενό τη φορά — δεν είναι στιγμιαίο.
            {aiCount > 0
              ? ` Τα ${aiCount} κενά που χρησιμοποιούν AI (DPIA, πολιτικές) θέλουν 10–30 δευτ. το καθένα, οπότε περιμένετε έως ${formatDuration(aiCount * 30)}.`
              : " Τα υπόλοιπα κενά δεν χρησιμοποιούν AI, οπότε θα ολοκληρωθεί γρήγορα."}
          </p>
        </div>
        <Button type="button" size="sm" disabled={running} onClick={onRun} className="gap-1.5 shrink-0">
          {running && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {running ? `Εκτελείται… ${elapsed}δ` : "Κάλυψη όλων"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/**
 * Οι δύο μορφές του άρθρου 28 είναι εναλλακτικές, όχι αθροιστικές — γι' αυτό
 * η επιλογή είναι ένα ζεύγος κουμπιών, όχι δύο checkboxes. Μία φορά καλυμμένο
 * το κενό, η επιλογή κρύβεται: αλλάζοντάς την δεν αναιρείται ό,τι παράχθηκε.
 */
function FormChoice({ gap, disabled }: { gap: Gap; disabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!DPA_FORM_TYPES.has(gap.remedyType as string) || gap.createdEntityId) return null;

  const isStandalone = gap.remedyType === "CREATE_DPA";

  function choose(form: "STANDALONE" | "CLAUSES") {
    setError(null);
    startTransition(async () => {
      try {
        await setDpaForm(gap.id, form);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Σφάλμα κατά την αλλαγή μορφής.");
      }
    });
  }

  return (
    <div className="rounded-sm border border-dashed p-2 space-y-1.5">
      <p className="text-xs text-muted-foreground">
        Οι όροι του άρθρου 28 μπαίνουν είτε ως αυτοτελές υπογεγραμμένο παράρτημα είτε ως ρήτρες μέσα στην
        κύρια σύμβαση — μία από τις δύο, ανά συνεργασία.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={isStandalone ? "default" : "outline"}
          disabled={disabled || pending}
          onClick={() => choose("STANDALONE")}
        >
          Αυτοτελές παράρτημα
        </Button>
        <Button
          type="button"
          size="sm"
          variant={!isStandalone ? "default" : "outline"}
          disabled={disabled || pending}
          onClick={() => choose("CLAUSES")}
        >
          Ρήτρες μέσα στη σύμβαση
        </Button>
        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function CopyClausesButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Χωρίς δικαίωμα clipboard ή μη ασφαλές context — δεν υπάρχει τίποτα άλλο να γίνει εδώ.
    }
  }

  return (
    <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={copy}>
      {copied ? <ClipboardCheck className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
      {copied ? "Αντιγράφηκε!" : "Αντιγραφή κειμένου"}
    </Button>
  );
}

/** Το αποτέλεσμα εκτέλεσης ενός κενού — τρεις πολύ διαφορετικοί τόνοι σκόπιμα. */
function RemedyResultPanel({ result, clauseText }: { result: RemedyResult; clauseText: string | null }) {
  if (result.status === "CREATED") {
    return (
      <div
        className="rounded-sm border p-2 space-y-1.5"
        style={{ background: "rgba(16,124,16,0.06)", borderColor: "rgba(16,124,16,0.25)" }}
      >
        <p className="text-xs font-medium flex items-center gap-1.5" style={{ color: "#107c10" }}>
          <CheckCircle2 className="h-3.5 w-3.5" /> Δημιουργήθηκε: {result.label}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {result.fileUrl && (
            <a
              href={result.fileUrl}
              target="_blank"
              rel="noreferrer"
              download
              className="text-xs underline"
              style={{ color: "rgb(0,120,212)" }}
            >
              Λήψη εγγράφου
            </a>
          )}
          {clauseText && <CopyClausesButton text={clauseText} />}
        </div>
      </div>
    );
  }

  if (result.status === "NEEDS_HUMAN") {
    // Σκόπιμα ΟΧΙ destructive: αυτό δεν είναι σφάλμα του συστήματος — είναι
    // μια απόφαση που μόνο άνθρωπος μπορεί να πάρει (π.χ. ορισμός DPO).
    return (
      <div
        className="rounded-sm border p-2 space-y-1"
        style={{ background: "rgba(0,120,212,0.05)", borderColor: "rgba(0,120,212,0.25)" }}
      >
        <p className="text-xs font-medium" style={{ color: "rgb(0,90,158)" }}>
          Χρειάζεται δική σας ενέργεια
        </p>
        <p className="text-xs text-muted-foreground">{result.reason}</p>
        <Link href={result.href} className="text-xs underline" style={{ color: "rgb(0,120,212)" }}>
          Μετάβαση →
        </Link>
      </div>
    );
  }

  return <p className="text-xs text-muted-foreground italic">{result.reason}</p>;
}

function GapRow({ gap, result, locked }: { gap: Gap; result?: RemedyResult; locked: boolean }) {
  const [pending, startTransition] = useTransition();
  const [dismissing, setDismissing] = useState(false);
  const [reason, setReason] = useState(gap.dismissReason ?? "");
  const [error, setError] = useState<string | null>(null);

  const articles = Array.isArray(gap.gdprArticles) ? (gap.gdprArticles as string[]) : [];
  const severity = SEVERITY_LABEL[gap.severity] ?? SEVERITY_LABEL.LOW;
  const status = STATUS_LABEL[gap.status] ?? STATUS_LABEL.OPEN;
  const clauseText = gap.remedyType === "CREATE_CONTRACT_CLAUSES" ? extractClauseText(gap.remedyPayload) : null;

  function setStatus(next: "DRAFTED" | "RESOLVED") {
    setError(null);
    startTransition(() => {
      setGapStatus(gap.id, next);
    });
  }

  function submitDismiss() {
    // Το setGapStatus θα το απορρίψει ούτως ή άλλως — αλλά ο χρήστης πρέπει
    // να το μάθει πριν πατήσει, όχι μετά από αποτυχημένο αίτημα.
    if (!reason.trim()) {
      setError("Η απόρριψη κενού απαιτεί γραπτή αιτιολογία.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await setGapStatus(gap.id, "DISMISSED", reason);
        setDismissing(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Σφάλμα");
      }
    });
  }

  return (
    <li
      className="rounded-sm border p-3 space-y-2"
      style={{ borderColor: gap.severity === "CRITICAL" ? "rgba(164,38,44,0.35)" : "rgb(var(--border))" }}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={severity.variant}>{severity.text}</Badge>
        <Badge variant="outline">{CATEGORY_LABEL[gap.category] ?? gap.category}</Badge>
        <Badge variant={status.variant}>{status.text}</Badge>
      </div>

      <div className="space-y-1">
        <p className="font-medium text-sm">{gap.title}</p>
        <p className="text-sm text-muted-foreground">{gap.description}</p>
      </div>

      {articles.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {articles.map((a) => (
            <Badge key={a} variant="outline">
              {a}
            </Badge>
          ))}
        </div>
      )}

      {gap.remedyType && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {!!gap.createdEntityId && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: "#107c10" }} />}
          Προτεινόμενη κάλυψη: <span className="font-medium">{REMEDY_LABEL[gap.remedyType] ?? gap.remedyType}</span>
        </p>
      )}

      <FormChoice gap={gap} disabled={locked} />

      {result && <RemedyResultPanel result={result} clauseText={clauseText} />}
      {!result && clauseText && (
        <div className="flex">
          <CopyClausesButton text={clauseText} />
        </div>
      )}

      {gap.status === "DISMISSED" && gap.dismissReason && (
        <p className="text-xs text-muted-foreground italic">Αιτιολογία απόρριψης: {gap.dismissReason}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending || locked || gap.status === "DRAFTED"}
          onClick={() => setStatus("DRAFTED")}
        >
          Σε πρόχειρο
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending || locked || gap.status === "RESOLVED"}
          onClick={() => setStatus("RESOLVED")}
        >
          Καλύφθηκε
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending || locked}
          onClick={() => {
            setDismissing((v) => !v);
            setError(null);
          }}
        >
          Δεν ισχύει
        </Button>
        {pending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {dismissing && (
        <div className="space-y-1.5 pt-1">
          <Textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Αιτιολογία απόρριψης — υποχρεωτική"
            rows={2}
            className="text-sm"
          />
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" disabled={pending || !reason.trim()} onClick={submitDismiss}>
              Υποβολή απόρριψης
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setDismissing(false)}>
              Άκυρο
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </li>
  );
}
