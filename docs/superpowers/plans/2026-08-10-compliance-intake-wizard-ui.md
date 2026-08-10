# Wizard Πρόσληψης — UI (Στάδιο 1β) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Δίνει διεπαφή στον αγωγό του Σταδίου 1α: έξι οθόνες όπου ανεβάζεις έγγραφα, βλέπεις τι διάβασε το σύστημα, **αγκυρώνεις ποιος είναι ποιος**, και δημιουργείς έργο.

**Architecture:** Server components για κάθε ανάγνωση, `"use client"` μόνο στο ανέβασμα, στο polling του OCR και στις φόρμες. Η κατάσταση ζει στο `ComplianceIntake.stage`, οπότε ο wizard συνεχίζει από όπου έμεινε. Καμία νέα επιχειρησιακή λογική: όλες οι αποφάσεις είναι ήδη υλοποιημένες και δοκιμασμένες στο `src/lib/intake/*`.

**Tech Stack:** Next.js 16.2 App Router, Prisma 5, shadcn-style components σε `src/components/ui`, Fluent-inspired styling όπως το υπόλοιπο app.

**Spec:** `docs/superpowers/specs/2026-08-08-compliance-intake-wizard-design.md`, ενότητες «Τα βήματα του wizard» και «Βήμα 4 — η οθόνη αγκύρωσης».

---

## Τι υπάρχει ήδη

Server actions σε `src/actions/intake.ts`: `createIntake`, `addIntakeDocument`, `findDuplicateDocuments`, `persistExtraction`, `buildConfirmedParties`, `persistReasoning`, `setPartyRole`, `setGapStatus`, `checkCommit`, `commitIntake`.

API routes: `POST /api/intake/ocr` (ένα έγγραφο ανά κλήση), `POST /api/intake/analyze` (εξαγωγή + κρίση).

Καθαρές συναρτήσεις: `canCommit` επιστρέφει `{ allowed, reasons[] }` — το UI δείχνει τους λόγους, δεν τους ξαναϋπολογίζει.

**268 δοκιμές περνούν.** Καμία δεν πρέπει να σπάσει.

## Δομή αρχείων

| Αρχείο | Ευθύνη |
|---|---|
| `src/actions/intake-ui.ts` | Δύο νέες ενέργειες: τριάγε προμηθευτή, χειροκίνητη προσθήκη μέρους |
| `src/app/(app)/intake/page.tsx` | Λίστα εκτελέσεων + κουμπί νέας |
| `src/app/(app)/intake/[id]/page.tsx` | Κέλυφος wizard — διαβάζει `stage`, δρομολογεί βήμα |
| `src/app/(app)/intake/[id]/stepper.tsx` | Οπτική μπάρα βημάτων (server) |
| `src/app/(app)/intake/[id]/step-documents.tsx` | Βήματα 1–2: τίτλος και ανέβασμα |
| `src/app/(app)/intake/[id]/step-reading.tsx` | Βήμα 3: παράλληλο OCR με πρόοδο |
| `src/app/(app)/intake/[id]/step-parties.tsx` | Βήμα 4: αγκύρωση — το ουσιαστικό |
| `src/app/(app)/intake/[id]/step-gaps.tsx` | Βήμα 5: κενά |
| `src/app/(app)/intake/[id]/step-commit.tsx` | Βήμα 6: σύνοψη και δημιουργία |
| `src/components/layout/sidebar.tsx` | Ένα link (τροποποίηση) |

---

## Task 1: Ενέργειες που λείπουν

Το τριάγε προμηθευτή ζει μέσα στο `extraction` JSON και δεν υπάρχει τρόπος να το αλλάξει ο χρήστης. Χωρίς αυτό, το βήμα 4 δεν μπορεί να κάνει τη δουλειά που περιγράφει το spec.

**Files:**
- Create: `src/actions/intake-ui.ts`

- [ ] **Step 1: Γράψε τις δύο ενέργειες**

```ts
// src/actions/intake-ui.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";
import { logAction } from "@/lib/action-logger";
import { revalidatePath } from "next/cache";
import { ExtractionSchema, type Extraction } from "@/lib/intake/schemas";

type Triage = "PROCESSES_DATA" | "SUPPLIES_ONLY" | "UNCLEAR";

/**
 * Αλλάζει το τριάγε ενός προμηθευτή.
 *
 * Η διάκριση «επεξεργάζεται δεδομένα» ή «απλώς προμηθεύει» καθορίζει αν θα
 * ζητηθεί σύμβαση επεξεργασίας. Η ίδια μάρκα είναι το ένα ή το άλλο ανάλογα
 * με το αν πουλάει συσκευή ή φιλοξενεί υπηρεσία — ένα μοντέλο δεν πρέπει να
 * κλείνει μόνο του αυτή την απόφαση.
 */
export async function setVendorTriage(intakeId: string, vendorName: string, triage: Triage) {
  await requireUserId();

  const intake = await prisma.complianceIntake.findUniqueOrThrow({
    where: { id: intakeId },
    select: { extraction: true },
  });

  const extraction = ExtractionSchema.parse(intake.extraction ?? {});
  const vendor = extraction.vendors.find((v) => v.name === vendorName);
  if (!vendor) throw new Error(`Δεν βρέθηκε προμηθευτής «${vendorName}»`);
  vendor.triage = triage;

  await prisma.complianceIntake.update({
    where: { id: intakeId },
    data: { extraction: extraction as never },
  });

  await logAction({
    action: "UPDATE",
    entity: "ComplianceIntake",
    entityId: intakeId,
    details: { vendor: vendorName, triage },
  });
  revalidatePath(`/intake/${intakeId}`);
}

/**
 * Προσθέτει μέρος που τα έγγραφα δεν κατονόμασαν.
 *
 * Αυτό είναι η αγκύρωση του βήματος 4: μια προσφορά δεν θεμελιώνει
 * συμβαλλόμενους, οπότε τον αντισυμβαλλόμενο τον δηλώνει ο άνθρωπος.
 */
export async function addPartyManually(
  intakeId: string,
  companyId: string,
  side: "OWN_MOTHER" | "OWN_GROUP" | "EXTERNAL"
) {
  await requireUserId();

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { id: true, name: true, legalName: true, vatNumber: true, addressLine1: true, contactEmail: true },
  });

  const existing = await prisma.intakeParty.findFirst({ where: { intakeId, companyId } });
  if (existing) throw new Error(`Η «${company.name}» υπάρχει ήδη στα μέρη`);

  await prisma.intakeParty.create({
    data: {
      intakeId,
      companyId: company.id,
      side: side as never,
      matchMethod: "MANUAL" as never,
      matchScore: null,
      extractedName: company.legalName ?? company.name,
      extractedVat: company.vatNumber,
      extractedAddress: company.addressLine1,
      extractedEmail: company.contactEmail,
    },
  });

  await logAction({
    action: "CREATE",
    entity: "IntakeParty",
    entityId: intakeId,
    details: { company: company.name, side, source: "manual" },
  });
  revalidatePath(`/intake/${intakeId}`);
}

/** Διαγράφει μέρος που μπήκε κατά λάθος — π.χ. μάρκα που πέρασε ως εταιρία. */
export async function removeParty(partyId: string) {
  await requireUserId();
  const party = await prisma.intakeParty.delete({ where: { id: partyId } });
  await logAction({ action: "DELETE", entity: "IntakeParty", entityId: partyId });
  revalidatePath(`/intake/${party.intakeId}`);
}

/** Ο κατάλογος μερών, προμηθευτών και κενών για την οθόνη αγκύρωσης. */
export async function getIntakeDetail(intakeId: string) {
  await requireUserId();
  const intake = await prisma.complianceIntake.findUniqueOrThrow({
    where: { id: intakeId },
    include: {
      documents: { orderBy: { createdAt: "asc" } },
      parties: { orderBy: { createdAt: "asc" }, include: { company: { select: { name: true } } } },
      gaps: { orderBy: [{ severity: "asc" }, { createdAt: "asc" }] },
    },
  });

  const extraction: Extraction | null = intake.extraction
    ? ExtractionSchema.parse(intake.extraction)
    : null;

  return { intake, extraction };
}
```

- [ ] **Step 2: Επαλήθευσε**

Run: `npx tsc --noEmit && npx eslint src/actions/intake-ui.ts`
Expected: καθαρά και τα δύο.

Το `ExtractionSchema.parse(intake.extraction ?? {})` δουλεύει επειδή κάθε πεδίο έχει προεπιλογή — ένα άδειο αντικείμενο δίνει έγκυρη κενή εξαγωγή. Επιβεβαίωσέ το:

Run: `npx tsx -e "import {ExtractionSchema} from './src/lib/intake/schemas'; console.log(JSON.stringify(ExtractionSchema.parse({})))"`
Expected: JSON με `parties: []`, `vendors: []`.

- [ ] **Step 3: Commit**

```bash
git add src/actions/intake-ui.ts
git commit -m "feat(intake): actions for vendor triage and manual party anchoring"
```

---

## Task 2: Λίστα εκτελέσεων και σύνδεσμος στο μενού

**Files:**
- Create: `src/app/(app)/intake/page.tsx`
- Create: `src/app/(app)/intake/new-intake-button.tsx`
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Γράψε τη λίστα**

```tsx
// src/app/(app)/intake/page.tsx
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewIntakeButton } from "./new-intake-button";
import { FileSearch, ChevronRight } from "lucide-react";

const STATUS_LABEL: Record<string, { text: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" }> = {
  DRAFT:           { text: "Πρόχειρο",        variant: "secondary" },
  PROCESSING:      { text: "Σε επεξεργασία",  variant: "default" },
  AWAITING_REVIEW: { text: "Προς έλεγχο",     variant: "warning" },
  COMMITTED:       { text: "Ολοκληρώθηκε",    variant: "success" },
  FAILED:          { text: "Σφάλμα",          variant: "destructive" },
  CANCELLED:       { text: "Ακυρώθηκε",       variant: "secondary" },
};

export default async function IntakeListPage() {
  const session = await auth();
  const intakes = await prisma.complianceIntake.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { documents: true, parties: true, gaps: true } } },
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar userName={session?.user?.name} userRole={(session?.user as any)?.role} pageTitle="Πρόσληψη Συμβάσεων" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Ανέβασε σύμβαση ή προσφορά και ο οδηγός εντοπίζει τα μέρη, τους ρόλους και τα κενά συμμόρφωσης.
            </p>
            <NewIntakeButton />
          </div>

          {intakes.length === 0 && (
            <Card>
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                <FileSearch className="h-8 w-8 mx-auto mb-3 opacity-40" />
                Καμία πρόσληψη ακόμη.
              </CardContent>
            </Card>
          )}

          {intakes.map((i) => {
            const s = STATUS_LABEL[i.status] ?? STATUS_LABEL.DRAFT;
            return (
              <Link key={i.id} href={`/intake/${i.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{i.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {i._count.documents} έγγραφα · {i._count.parties} μέρη · {i._count.gaps} κενά ·{" "}
                        {new Intl.DateTimeFormat("el-GR", { dateStyle: "medium", timeStyle: "short" }).format(i.updatedAt)}
                      </p>
                    </div>
                    <Badge variant={s.variant}>{s.text}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Γράψε το κουμπί νέας πρόσληψης**

```tsx
// src/app/(app)/intake/new-intake-button.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createIntake } from "@/actions/intake";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Plus, Loader2 } from "lucide-react";

export function NewIntakeButton() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        const id = await createIntake(title);
        router.push(`/intake/${id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Σφάλμα");
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-1.5 shrink-0">
        <Plus className="h-4 w-4" /> Νέα Πρόσληψη
      </Button>
      {open && (
        <Modal open onClose={() => setOpen(false)} title="Νέα Πρόσληψη">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Τίτλος συνεργασίας *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="π.χ. Σύμβαση CRM — ΑΦΟΙ ΚΟΛΛΕΡΗ"
                required
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Τις εταιρίες θα τις επιβεβαιώσεις αργότερα, αφού ο οδηγός διαβάσει τα έγγραφα.
              </p>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Άκυρο</Button>
              <Button type="submit" disabled={pending || !title.trim()} className="gap-1.5">
                {pending && <Loader2 className="h-4 w-4 animate-spin" />} Δημιουργία
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
```

**Πριν το γράψεις**, άνοιξε το `src/components/ui/modal.tsx` και επιβεβαίωσε τα props (`open`, `onClose`, `title`, `size`). Αν διαφέρουν, προσάρμοσε την κλήση — μην αλλάξεις το κοινό component.

- [ ] **Step 3: Πρόσθεσε τον σύνδεσμο στο μενού**

Στο `src/components/layout/sidebar.tsx`, στην ομάδα «Συμμόρφωση», μετά το «DPIA & DPA»:

```tsx
      { label: "Πρόσληψη Συμβάσεων", href: "/intake", icon: MdFindInPage },
```

Πρόσθεσε το `MdFindInPage` στα imports από `react-icons/md`.

- [ ] **Step 4: Επαλήθευσε**

Run: `npx tsc --noEmit && npm run build`
Expected: καθαρά· η διαδρομή `/intake` εμφανίζεται στη λίστα.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/intake" src/components/layout/sidebar.tsx
git commit -m "feat(intake): intake list page and sidebar entry"
```

---

## Task 3: Κέλυφος wizard και δρομολόγηση βημάτων

**Files:**
- Create: `src/app/(app)/intake/[id]/page.tsx`
- Create: `src/app/(app)/intake/[id]/stepper.tsx`

- [ ] **Step 1: Γράψε τον stepper**

```tsx
// src/app/(app)/intake/[id]/stepper.tsx
import { Check } from "lucide-react";

export const STEPS = [
  { stage: "UPLOAD",     label: "Έγγραφα" },
  { stage: "OCR",        label: "Ανάγνωση" },
  { stage: "EXTRACTION", label: "Εξαγωγή" },
  { stage: "MATCHING",   label: "Μέρη & Ρόλοι" },
  { stage: "REASONING",  label: "Κενά" },
  { stage: "REVIEW",     label: "Σύνοψη" },
] as const;

export function Stepper({ current }: { current: string }) {
  const idx = Math.max(0, STEPS.findIndex((s) => s.stage === current));

  return (
    <ol className="flex items-center gap-1 text-xs">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li key={s.stage} className="flex items-center gap-1">
            <span
              className="flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 font-medium"
              style={{
                background: active ? "rgba(0,120,212,0.10)" : done ? "rgba(16,124,16,0.08)" : "transparent",
                color: active ? "#0078d4" : done ? "#107c10" : "rgb(var(--muted-foreground))",
              }}
            >
              {done ? <Check className="h-3 w-3" /> : <span className="tabular-nums">{i + 1}</span>}
              {s.label}
            </span>
            {i < STEPS.length - 1 && <span className="text-muted-foreground/40">›</span>}
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 2: Γράψε το κέλυφος**

```tsx
// src/app/(app)/intake/[id]/page.tsx
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { getIntakeDetail } from "@/actions/intake-ui";
import { checkCommit } from "@/actions/intake";
import { Stepper } from "./stepper";
import { StepDocuments } from "./step-documents";
import { StepReading } from "./step-reading";
import { StepParties } from "./step-parties";
import { StepGaps } from "./step-gaps";
import { StepCommit } from "./step-commit";

export default async function IntakeWizardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  let detail;
  try {
    detail = await getIntakeDetail(id);
  } catch {
    notFound();
  }
  const { intake, extraction } = detail;
  const verdict = await checkCommit(id);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar userName={session?.user?.name} userRole={(session?.user as any)?.role} pageTitle={intake.title} />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Stepper current={intake.stage} />

          {intake.lastError && (
            <div className="rounded-sm px-4 py-3 text-sm"
                 style={{ background: "rgba(164,38,44,0.06)", border: "1px solid rgba(164,38,44,0.22)", color: "#a4262c" }}>
              <strong>Το τελευταίο βήμα απέτυχε.</strong> {intake.lastError}
            </div>
          )}

          {intake.status === "COMMITTED" && intake.projectId && (
            <div className="rounded-sm px-4 py-3 text-sm"
                 style={{ background: "rgba(16,124,16,0.08)", border: "1px solid rgba(16,124,16,0.25)", color: "#107c10" }}>
              Η πρόσληψη ολοκληρώθηκε. <a className="underline" href={`/dev/projects/${intake.projectId}`}>Άνοιγμα έργου</a>
            </div>
          )}

          <StepDocuments intake={intake} />
          {intake.documents.length > 0 && <StepReading intake={intake} />}
          {extraction && <StepParties intake={intake} extraction={extraction} />}
          {intake.gaps.length > 0 && <StepGaps intake={intake} />}
          {intake.parties.length > 0 && <StepCommit intake={intake} verdict={verdict} />}
        </div>
      </main>
    </div>
  );
}
```

Ο wizard είναι **μία κυλιόμενη σελίδα** με προοδευτική αποκάλυψη, όχι έξι ξεχωριστές διαδρομές. Ο χρήστης βλέπει τι έγινε πριν χωρίς πισωγυρίσματα, και το `stage` οδηγεί μόνο τον stepper.

- [ ] **Step 3: Commit** (μετά το Task 4, όταν τα παιδικά components υπάρχουν και χτίζει)

---

## Task 4: Βήματα 1–2 — έγγραφα

**Files:**
- Create: `src/app/(app)/intake/[id]/step-documents.tsx`

- [ ] **Step 1: Γράψε το component**

Server component που δείχνει τα ανεβασμένα έγγραφα, με ένα client παιδί για το ανέβασμα.

Απαιτήσεις, όλες επιβεβαιωμένες από τον υπάρχοντα κώδικα:
- Δέχεται `application/pdf`, `image/jpeg`, `image/png`, `image/webp`, DOCX. Το `addIntakeDocument` απορρίπτει τα υπόλοιπα με ελληνικό μήνυμα — δείξε το μήνυμα, μη διπλασιάσεις τον έλεγχο.
- Επιλογέας είδους ανά αρχείο πριν το ανέβασμα: `CONTRACT` (προεπιλογή), `OFFER`, `ANNEX`, `CORRESPONDENCE`. Το είδος καθορίζει το prompt εξαγωγής, οπότε είναι ουσιαστική επιλογή, όχι ετικέτα — γράψε το ως βοηθητικό κείμενο.
- Μετά από κάθε ανέβασμα κάλεσε `findDuplicateDocuments` και δείξε προειδοποίηση με σύνδεσμο, όχι εμπόδιο.
- Κάθε έγγραφο δείχνει όνομα, μέγεθος, είδος, και `ocrStatus` ως badge.

Χρησιμοποίησε `useTransition` και `FormData`, όπως το `src/components/modules/logo-uploader.tsx`.

- [ ] **Step 2: Επαλήθευσε ότι χτίζει**

Run: `npx tsc --noEmit && npm run build`

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/intake/[id]"
git commit -m "feat(intake): wizard shell and document upload steps"
```

---

## Task 5: Βήμα 3 — ανάγνωση με παράλληλο OCR

**Files:**
- Create: `src/app/(app)/intake/[id]/step-reading.tsx`

- [ ] **Step 1: Γράψε το component**

`"use client"`. Η ουσία είναι εδώ:

- Κουμπί «Ανάγνωση εγγράφων» ορατό όσο υπάρχει έγγραφο με `ocrStatus` `PENDING` ή `FAILED`.
- Στο πάτημα, **ένα `fetch` ανά έγγραφο, παράλληλα** προς `/api/intake/ocr` με `{ documentId }`. Μια 40σέλιδη σύμβαση δεν διαβάζεται μέσα σε ένα request — γι' αυτό είναι χωριστά αιτήματα.
- Κράτα κατάσταση ανά έγγραφο τοπικά (`RUNNING` / `DONE` / `FAILED`) και δείξε την άμεσα· μετά το πέρας όλων κάλεσε `router.refresh()`.
- Η αποτυχία ενός εγγράφου **δεν σταματά τα υπόλοιπα**. Δείξε το σφάλμα δίπλα στο έγγραφο και κουμπί επανάληψης μόνο γι' αυτό.
- Όταν όλα είναι `DONE`, εμφάνισε κουμπί «Ανάλυση» που καλεί `/api/intake/analyze` με `{ intakeId }` και μετά `router.refresh()`. Δείξε ότι αυτό διαρκεί — στη μέτρησή μας 25–45 δευτερόλεπτα.

Δείξε ανά έγγραφο, μετά την ανάγνωση: ποιότητα με δύο δεκαδικά, ποιο μοντέλο διάβασε, και σήμανση αν κλιμακώθηκε.

**Μην** εμφανίσεις ποιότητα για DOCX ως ουσιαστικό μέτρο — είναι πάντα 1 επειδή δεν υπήρξε ανάγνωση να αποτύχει. Γράψε «Word — χωρίς OCR».

- [ ] **Step 2: Επαλήθευσε και commit**

```bash
git add "src/app/(app)/intake/[id]/step-reading.tsx"
git commit -m "feat(intake): parallel OCR step with per-document recovery"
```

---

## Task 6: Βήμα 4 — η οθόνη αγκύρωσης

Το σημαντικότερο βήμα. Διάβασε την ενότητα «Βήμα 4 — η οθόνη αγκύρωσης» του spec πριν γράψεις κώδικα.

**Files:**
- Create: `src/app/(app)/intake/[id]/step-parties.tsx`

- [ ] **Step 1: Γράψε το component**

Τρία τμήματα.

**Α. Τα μέρη.** Για κάθε `IntakeParty`: επωνυμία, ΑΦΜ, πώς ταίριαξε (`VAT` / `NAME` / `MANUAL` / δεν ταίριαξε) με το score, και δύο επιλογείς — `side` και `confirmedRole`. Δίπλα, η αιτιολόγηση του AI και τα άρθρα GDPR ως μικρά badges. Κουμπί διαγραφής για μέρος που μπήκε κατά λάθος.

Ο ρόλος αλλάζει με `setPartyRole`, το `side` με την ίδια ενέργεια. Και τα δύο κρατούν το `proposedRole` άθικτο — σε έλεγχο, το «τι πρότεινε το σύστημα και τι αποφάσισε ο άνθρωπος» είναι ακριβώς η ερώτηση που πέφτει.

**Β. Η αγκύρωση, όταν λείπει.** Αν κανένα μέρος δεν έχει `side` ≠ `EXTERNAL`, ή αν δεν υπάρχει κανένα `EXTERNAL`, δείξε πλαίσιο δράσης:

> *Δεν εντοπίστηκε αντισυμβαλλόμενος — οι προσφορές δεν θεμελιώνουν μέρη. Ο αποδέκτης φαίνεται να είναι «{recipientHint}». Είναι αυτός ο πελάτης;*

Με επιλογέα εταιρίας από τη βάση (φόρτωσε με `listCompanies` από `src/actions/companies.ts`), προσυμπληρωμένο με το `recipientHint` αν ταιριάζει κάποια, και κουμπί που καλεί `addPartyManually`. Αν δεν υπάρχει η εταιρία, σύνδεσμος προς `/admin/companies`.

Το ίδιο πλαίσιο, με διαφορετικό κείμενο, όταν λείπει η **δική μας** πλευρά.

**Γ. Οι προμηθευτές.** Χωριστά από τα μέρη, με επικεφαλίδα που εξηγεί τη διαφορά:

> *Οι προμηθευτές δεν είναι συμβαλλόμενοι. Όσοι επεξεργάζονται δεδομένα για λογαριασμό μας χρειάζονται σύμβαση· όσοι απλώς προμηθεύουν εξοπλισμό όχι.*

Ομαδοποιημένοι σε τρεις στήλες κατά τριάγε, ο καθένας με το `evidence` του σε μικρά γράμματα, και επιλογέα που καλεί `setVendorTriage`.

- [ ] **Step 2: Επαλήθευσε και commit**

```bash
git add "src/app/(app)/intake/[id]/step-parties.tsx"
git commit -m "feat(intake): anchoring screen for parties, roles and vendor triage"
```

---

## Task 7: Βήματα 5–6 — κενά και ολοκλήρωση

**Files:**
- Create: `src/app/(app)/intake/[id]/step-gaps.tsx`
- Create: `src/app/(app)/intake/[id]/step-commit.tsx`

- [ ] **Step 1: Τα κενά**

Ταξινομημένα κατά σοβαρότητα, τα `CRITICAL` πρώτα και **μη συμπτυσσόμενα**. Κάθε κενό: τίτλος, περιγραφή, badges άρθρων, και το προτεινόμενο remedy ως ετικέτα.

Ενέργειες ανά κενό μέσω `setGapStatus`: «Σε πρόχειρο» (`DRAFTED`), «Καλύφθηκε» (`RESOLVED`), «Δεν ισχύει» (`DISMISSED`). Η τελευταία **ανοίγει πεδίο αιτιολογίας και δεν υποβάλλεται κενή** — το `setGapStatus` το απορρίπτει ούτως ή άλλως, αλλά ο χρήστης πρέπει να το μάθει πριν πατήσει.

- [ ] **Step 2: Η ολοκλήρωση**

Δείξε το `verdict` από το `checkCommit`:

- Όταν `allowed === false`, λίστα των `reasons` και **ανενεργό** κουμπί. Οι λόγοι είναι ήδη γραμμένοι σε ελληνικά από τον `canCommit` — τύπωσέ τους αυτούσιους, μην τους ξαναγράψεις.
- Όταν `allowed === true`, σύνοψη του τι θα δημιουργηθεί: όνομα έργου, αντισυμβαλλόμενος, πλήθος `DpaContract` που προκύπτουν από έγκυρα ζεύγη ρόλων, και πλήθος κενών ανά σοβαρότητα. Μετά κουμπί «Δημιουργία έργου» που καλεί `commitIntake` και πλοηγεί στο `/dev/projects/<id>`.

- [ ] **Step 3: Επαλήθευσε και commit**

```bash
git add "src/app/(app)/intake/[id]"
git commit -m "feat(intake): gaps review and project creation steps"
```

---

## Task 8: Επαλήθευση από άκρη σε άκρη στον browser

Ο αγωγός δοκιμάστηκε με script. Το UI πρέπει να δοκιμαστεί όπως το χρησιμοποιεί άνθρωπος.

- [ ] **Step 1: Ξεκίνα τον dev server**

Χρησιμοποίησε το `preview_start` με το `.claude/launch.json` («dg-gdpr», θύρα 3000). **Μην** τρέξεις `npm run dev` από το shell.

- [ ] **Step 2: Πέρασε μια πραγματική προσφορά**

Με το `/Users/kozyris/Documents/Προταση_Δωδωνη_B2B.docx`:

1. `/intake` → «Νέα Πρόσληψη» → τίτλος
2. Ανέβασε το αρχείο με είδος **OFFER**
3. «Ανάγνωση» — επιβεβαίωσε ότι δείχνει «Word — χωρίς OCR»
4. «Ανάλυση» — περίμενε· επιβεβαίωσε ότι εμφανίζεται το πλαίσιο αγκύρωσης με προτεινόμενο αποδέκτη «ΔΩΔΩΝΗ Α.Ε.»
5. Αγκύρωσε: δική μας εταιρία και αντισυμβαλλόμενος
6. Επιβεβαίωσε ότι το κουμπί ολοκλήρωσης **παραμένει ανενεργό** όσο υπάρχει κρίσιμο κενό σε `OPEN`
7. Βάλε ένα κρίσιμο κενό σε `DRAFTED`, επιβεβαίωσε ότι το κουμπί ενεργοποιείται

**ΜΗΝ πατήσεις «Δημιουργία έργου».** Δημιουργεί πραγματικό `Project` και `DpaContract` στη ζωντανή βάση. Σταμάτα εκεί και ανάφερε.

- [ ] **Step 3: Έλεγξε κονσόλα και logs**

`read_console_messages` και `preview_logs` — καμία εξαίρεση, κανένα hydration warning.

- [ ] **Step 4: Στιγμιότυπο της οθόνης αγκύρωσης**

Είναι το βήμα που δικαιολογεί όλο το έργο· τράβα screenshot για τον χρήστη.

- [ ] **Step 5: Commit τυχόν διορθώσεων**

---

## Έλεγχος πληρότητας

- [ ] `npx tsc --noEmit` καθαρό
- [ ] `npx vitest run` — 268 δοκιμές, καμία σπασμένη
- [ ] `npm run build` επιτυχές, οι διαδρομές `/intake` και `/intake/[id]` παρούσες
- [ ] `npx eslint "src/app/(app)/intake" src/actions/intake-ui.ts` χωρίς `error`
- [ ] Η βάση αμετάβλητη σε έργα: `project.count()` ίδιο με πριν
