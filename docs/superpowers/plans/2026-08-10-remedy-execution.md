# Αυτόματη Κάλυψη Κενών (Στάδιο 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Για κάθε `IntakeGap` παράγει το πραγματικό περιεχόμενο που το καλύπτει — DPA, ρήτρες σύμβασης, DPIA, πολιτική — σε κατάσταση `DRAFT`, με ένα κουμπί «Κάλυψη όλων».

**Architecture:** Ένα μητρώο εκτελεστών, ένας ανά `RemedyType`, όλοι με την ίδια υπογραφή. Ένα κοινό `RemedyContext` χτίζεται μία φορά ανά εκτέλεση. Το περιεχόμενο παράγεται από τις **υπάρχουσες** γεννήτριες Word και τα υπάρχοντα AI routes — τροφοδοτημένα, επιτέλους, με τα πραγματικά δεδομένα της συνεργασίας.

**Tech Stack:** Next.js 16.2, Prisma 5 + MySQL, DeepSeek, `docx`, Bunny CDN, vitest.

**Spec:** `docs/superpowers/specs/2026-08-10-remedy-execution-design.md`

**Δεν καλύπτει:** την υπογραφή και το κλείσιμο του έργου — Στάδιο 3.

---

## Δομή αρχείων

| Αρχείο | Ευθύνη |
|---|---|
| `prisma/schema.prisma` | `CREATE_CONTRACT_CLAUSES` στο `RemedyType` |
| `src/lib/remedy/types.ts` | `RemedyContext`, `RemedyResult`, `Remedy` |
| `src/lib/remedy/context.ts` | Χτίζει το context μία φορά |
| `src/lib/remedy/clauses.ts` | Το κοινό νομικό περιεχόμενο άρθρου 28 — καθαρή συνάρτηση |
| `src/lib/remedy/dpa.ts` | `CREATE_DPA`, `CREATE_CONTRACT_CLAUSES`, `CREATE_JCA` |
| `src/lib/remedy/dpia.ts` | `CREATE_DPIA` |
| `src/lib/remedy/policy.ts` | `CREATE_POLICY` |
| `src/lib/remedy/manual.ts` | `ASSIGN_DPO`, `CREATE_TRAINING`, `CREATE_ROPA_ENTRY`, `CREATE_ASSESSMENT` |
| `src/lib/remedy/index.ts` | Μητρώο και `executeRemedy` |
| `src/actions/remedy.ts` | `executeGapRemedy`, `executeAllRemedies`, `setDpaForm` |
| `src/app/(app)/intake/[id]/step-gaps.tsx` | Κουμπί «Κάλυψη όλων», αποτελέσματα (τροποποίηση) |

---

## Task 1: Ο ένατος τύπος και η επιλογή μορφής

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Πρόσθεσε την τιμή στο `RemedyType`**

Στο `enum RemedyType`, μετά το `CREATE_DPA`:

```prisma
  CREATE_CONTRACT_CLAUSES
```

- [ ] **Step 2: Εφάρμοσε**

Run: `npx prisma db push && npx prisma generate`
Expected: συγχρονισμός χωρίς προειδοποίηση απώλειας — είναι **προσθήκη** τιμής enum.

Αν το `db push` προτείνει οτιδήποτε καταστροφικό σε πίνακα εκτός των τεσσάρων intake, **σταμάτα** και ανάφερε BLOCKED με την ακριβή έξοδο.

- [ ] **Step 3: Επιβεβαίωσε**

Run: `npx tsx -e "import {RemedyType} from '@prisma/client'; console.log(Object.keys(RemedyType).length, Object.keys(RemedyType).join(','))"`
Expected: `9` και η λίστα να περιέχει `CREATE_CONTRACT_CLAUSES`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(remedy): contract clauses as an alternative to a standalone DPA"
```

---

## Task 2: Το κοινό νομικό περιεχόμενο

Το DPA και οι ρήτρες σύμβασης είναι **το ίδιο περιεχόμενο σε δύο μορφές**. Γράφεται μία φορά.

**Files:**
- Create: `src/lib/remedy/clauses.ts`
- Test: `src/lib/remedy/clauses.test.ts`

- [ ] **Step 1: Γράψε το failing test**

```ts
// src/lib/remedy/clauses.test.ts
import { describe, it, expect } from "vitest";
import { buildArticle28Clauses, type ClauseInput } from "./clauses";

const input: ClauseInput = {
  controllerName: "ΚΟΣΜΟΚΑΡ Α.Ε.",
  processorName: "DGSOFT ΕΕ",
  subject: "Ανάπτυξη και υποστήριξη CRM",
  dataCategories: ["Στοιχεία πελατών", "Ιστορικό παραγγελιών"],
  purposes: ["Λειτουργία και υποστήριξη του συστήματος"],
  retentionPeriod: "Για τη διάρκεια της σύμβασης και 12 μήνες μετά",
  subProcessors: ["Coolify", "Hetzner Online GmbH"],
  crossBorderTransfer: false,
  specialCategories: false,
};

describe("buildArticle28Clauses", () => {
  it("παράγει τις υποχρεωτικές ρήτρες του άρθρου 28 παρ. 3", () => {
    const cs = buildArticle28Clauses(input);
    const all = cs.map((c) => c.title + " " + c.body).join(" ");
    // Οι οκτώ υποχρεωτικές δεσμεύσεις της παρ. 3
    for (const term of ["εντολή", "εμπιστευτικ", "ασφάλεια", "υποεκτελ", "δικαιώματα", "συνδρομή", "διαγραφή", "έλεγχ"]) {
      expect(all.toLowerCase()).toContain(term.toLowerCase());
    }
  });

  it("αναφέρει ονομαστικά τα μέρη", () => {
    const all = buildArticle28Clauses(input).map((c) => c.body).join(" ");
    expect(all).toContain("ΚΟΣΜΟΚΑΡ Α.Ε.");
    expect(all).toContain("DGSOFT ΕΕ");
  });

  it("απαριθμεί τους υποεκτελούντες που βρέθηκαν", () => {
    const all = buildArticle28Clauses(input).map((c) => c.body).join(" ");
    expect(all).toContain("Coolify");
    expect(all).toContain("Hetzner Online GmbH");
  });

  it("χωρίς υποεκτελούντες, η ρήτρα λέει ότι δεν υπάρχουν", () => {
    const all = buildArticle28Clauses({ ...input, subProcessors: [] }).map((c) => c.body).join(" ");
    expect(all).toMatch(/δεν χρησιμοποι|καμία|κανένας/i);
  });

  it("προσθέτει ρήτρα διασυνοριακής μεταφοράς μόνο όταν υπάρχει", () => {
    const without = buildArticle28Clauses(input).map((c) => c.title).join("|");
    const with_ = buildArticle28Clauses({ ...input, crossBorderTransfer: true }).map((c) => c.title).join("|");
    expect(without).not.toMatch(/μεταφορ/i);
    expect(with_).toMatch(/μεταφορ/i);
  });

  it("προσθέτει ρήτρα ειδικών κατηγοριών μόνο όταν υπάρχουν", () => {
    const with_ = buildArticle28Clauses({ ...input, specialCategories: true }).map((c) => c.title).join("|");
    expect(with_).toMatch(/ειδικ/i);
  });

  it("κάθε ρήτρα έχει τίτλο και σώμα, κανένα κενό", () => {
    for (const c of buildArticle28Clauses(input)) {
      expect(c.title.trim().length).toBeGreaterThan(0);
      expect(c.body.trim().length).toBeGreaterThan(20);
    }
  });

  it("η αρίθμηση ξεκινά από όπου της πουν", () => {
    const cs = buildArticle28Clauses(input, 7);
    expect(cs[0].number).toBe(7);
    expect(cs[1].number).toBe(8);
  });

  it("χωρίς αρχική αρίθμηση ξεκινά από το 1", () => {
    expect(buildArticle28Clauses(input)[0].number).toBe(1);
  });
});
```

- [ ] **Step 2: Τρέξε το test**

Run: `npx vitest run src/lib/remedy/clauses.test.ts`
Expected: FAIL — δεν βρίσκεται το import.

- [ ] **Step 3: Γράψε την υλοποίηση**

```ts
// src/lib/remedy/clauses.ts

/**
 * Το νομικό περιεχόμενο του άρθρου 28 παρ. 3, ως δομημένες ρήτρες.
 *
 * Γράφεται ΜΙΑ φορά και σερβίρεται σε δύο μορφές: αυτοτελής σύμβαση
 * επεξεργασίας, ή αριθμημένα άρθρα προς ενσωμάτωση στη σύμβαση έργου. Αν το
 * κείμενο ζούσε δύο φορές, οι δύο εκδοχές θα απέκλιναν στην πρώτη διόρθωση.
 *
 * Καθαρή συνάρτηση: καμία κλήση AI, καμία βάση. Το άρθρο 28 δεν χρειάζεται
 * μοντέλο για να γραφτεί — είναι ο νόμος, και έχει συγκεκριμένο περιεχόμενο.
 * Το AI χρησιμεύει για ό,τι εξαρτάται από τη συγκεκριμένη συνεργασία, και
 * αυτά μπαίνουν εδώ ως δεδομένα.
 */

export interface ClauseInput {
  controllerName: string;
  processorName: string;
  subject: string | null;
  dataCategories: string[];
  purposes: string[];
  retentionPeriod: string;
  subProcessors: string[];
  crossBorderTransfer: boolean;
  specialCategories: boolean;
}

export interface Clause {
  number: number;
  title: string;
  body: string;
}

function list(items: string[], fallback: string): string {
  const clean = items.map((i) => i.trim()).filter(Boolean);
  return clean.length ? clean.join(", ") : fallback;
}

export function buildArticle28Clauses(input: ClauseInput, startAt = 1): Clause[] {
  const { controllerName: C, processorName: P } = input;
  const clauses: Omit<Clause, "number">[] = [];

  clauses.push({
    title: "Αντικείμενο και διάρκεια της επεξεργασίας",
    body:
      `Ο «${P}» επεξεργάζεται δεδομένα προσωπικού χαρακτήρα για λογαριασμό του «${C}» ` +
      `στο πλαίσιο${input.subject ? ` του έργου «${input.subject}»` : " της μεταξύ τους συνεργασίας"}. ` +
      `Η επεξεργασία διαρκεί όσο και η κύρια σύμβαση. Χρόνος διατήρησης: ${input.retentionPeriod}.`,
  });

  clauses.push({
    title: "Φύση, σκοπός και κατηγορίες δεδομένων",
    body:
      `Σκοποί της επεξεργασίας: ${list(input.purposes, "η εκτέλεση της κύριας σύμβασης")}. ` +
      `Κατηγορίες δεδομένων: ${list(input.dataCategories, "όσες απαιτούνται για την εκτέλεση της σύμβασης")}. ` +
      `Κατηγορίες υποκειμένων: πελάτες, συνεργάτες και προσωπικό του «${C}», κατά περίπτωση.`,
  });

  clauses.push({
    title: "Επεξεργασία μόνο κατ' εντολή",
    body:
      `Ο «${P}» επεξεργάζεται τα δεδομένα αποκλειστικά βάσει καταγεγραμμένων εντολών του «${C}», ` +
      `περιλαμβανομένων των διαβιβάσεων σε τρίτη χώρα, εκτός αν υποχρεούται από το ενωσιακό ή εθνικό δίκαιο. ` +
      `Στην περίπτωση αυτή ενημερώνει τον «${C}» πριν την επεξεργασία, εκτός αν το δίκαιο το απαγορεύει.`,
  });

  clauses.push({
    title: "Εμπιστευτικότητα",
    body:
      `Ο «${P}» διασφαλίζει ότι κάθε πρόσωπο που έχει πρόσβαση στα δεδομένα έχει αναλάβει δέσμευση ` +
      `εμπιστευτικότητας ή υπέχει κατάλληλη εκ του νόμου υποχρέωση εχεμύθειας, και ότι η πρόσβαση ` +
      `περιορίζεται σε όσους τη χρειάζονται για την εκτέλεση της σύμβασης.`,
  });

  clauses.push({
    title: "Ασφάλεια της επεξεργασίας",
    body:
      `Ο «${P}» λαμβάνει τα τεχνικά και οργανωτικά μέτρα του άρθρου 32 GDPR, λαμβάνοντας υπόψη τις ` +
      `τελευταίες εξελίξεις, το κόστος και τους κινδύνους: κρυπτογράφηση κατά τη μεταφορά και την ` +
      `αποθήκευση, έλεγχο πρόσβασης βάσει ρόλων, τήρηση αρχείων καταγραφής, αντίγραφα ασφαλείας και ` +
      `τακτική δοκιμή της αποτελεσματικότητάς τους.`,
  });

  clauses.push({
    title: "Υποεκτελούντες",
    body: input.subProcessors.length
      ? `Ο «${C}» παρέχει γενική έγκριση για τους ακόλουθους υποεκτελούντες: ${input.subProcessors.join(", ")}. ` +
        `Ο «${P}» ενημερώνει εγγράφως για κάθε προσθήκη ή αντικατάσταση και ο «${C}» δικαιούται να ` +
        `αντιταχθεί. Ο «${P}» επιβάλλει σε κάθε υποεκτελούντα τις ίδιες υποχρεώσεις με την παρούσα και ` +
        `ευθύνεται πλήρως για τις πράξεις του.`
      : `Ο «${P}» δεν χρησιμοποιεί υποεκτελούντες. Η προσφυγή σε υποεκτελούντα προϋποθέτει προηγούμενη ` +
        `έγγραφη ενημέρωση του «${C}» και επιβολή στον υποεκτελούντα των ίδιων υποχρεώσεων με την παρούσα.`,
  });

  clauses.push({
    title: "Συνδρομή στα δικαιώματα των υποκειμένων",
    body:
      `Ο «${P}» συνδράμει τον «${C}», με κατάλληλα τεχνικά και οργανωτικά μέτρα και στο μέτρο του δυνατού, ` +
      `ώστε να ανταποκρίνεται σε αιτήματα άσκησης δικαιωμάτων των κεφαλαίων ΙΙΙ GDPR. Διαβιβάζει αμελλητί ` +
      `κάθε τέτοιο αίτημα που λαμβάνει απευθείας και δεν απαντά ο ίδιος.`,
  });

  clauses.push({
    title: "Συνδρομή σε ασφάλεια, γνωστοποιήσεις και εκτιμήσεις αντικτύπου",
    body:
      `Ο «${P}» συνδράμει τον «${C}» στη συμμόρφωση με τα άρθρα 32 έως 36 GDPR. Γνωστοποιεί κάθε ` +
      `παραβίαση δεδομένων **χωρίς αδικαιολόγητη καθυστέρηση και σε κάθε περίπτωση εντός 24 ωρών** από ` +
      `τη στιγμή που λαμβάνει γνώση, παρέχοντας κάθε διαθέσιμη πληροφορία για την εκτίμηση του κινδύνου.`,
  });

  clauses.push({
    title: "Διαγραφή ή επιστροφή των δεδομένων",
    body:
      `Με τη λήξη της παροχής, ο «${P}» κατ' επιλογή του «${C}» διαγράφει ή επιστρέφει το σύνολο των ` +
      `δεδομένων και διαγράφει τα υφιστάμενα αντίγραφα, εκτός αν η διατήρησή τους απαιτείται από το ` +
      `ενωσιακό ή εθνικό δίκαιο. Η διαγραφή βεβαιώνεται εγγράφως.`,
  });

  clauses.push({
    title: "Έλεγχος και τεκμηρίωση",
    body:
      `Ο «${P}» θέτει στη διάθεση του «${C}» κάθε αναγκαία πληροφορία για την απόδειξη της συμμόρφωσης ` +
      `και επιτρέπει και διευκολύνει ελέγχους, περιλαμβανομένων επιθεωρήσεων, από τον «${C}» ή ελεγκτή ` +
      `που αυτός εντέλλεται. Ενημερώνει αμέσως αν κατά τη γνώμη του μια εντολή παραβιάζει τον Κανονισμό.`,
  });

  if (input.crossBorderTransfer) {
    clauses.push({
      title: "Διαβιβάσεις εκτός ΕΟΧ",
      body:
        `Τυχόν διαβίβαση δεδομένων εκτός Ευρωπαϊκού Οικονομικού Χώρου γίνεται μόνο κατόπιν εντολής του ` +
        `«${C}» και εφόσον υφίσταται νόμιμη βάση του κεφαλαίου V GDPR — απόφαση επάρκειας ή τυποποιημένες ` +
        `συμβατικές ρήτρες — συνοδευόμενη από εκτίμηση αντικτύπου της διαβίβασης όπου απαιτείται.`,
    });
  }

  if (input.specialCategories) {
    clauses.push({
      title: "Ειδικές κατηγορίες δεδομένων",
      body:
        `Η επεξεργασία περιλαμβάνει δεδομένα του άρθρου 9 GDPR. Ο «${P}» εφαρμόζει ενισχυμένα μέτρα ` +
        `προστασίας, περιορίζει την πρόσβαση στο απολύτως αναγκαίο προσωπικό και τηρεί χωριστό αρχείο ` +
        `καταγραφής των προσβάσεων σε αυτά.`,
    });
  }

  return clauses.map((c, i) => ({ ...c, number: startAt + i }));
}
```

- [ ] **Step 4: Τρέξε το test**

Run: `npx vitest run src/lib/remedy/clauses.test.ts`
Expected: PASS — 9 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/remedy/clauses.ts src/lib/remedy/clauses.test.ts
git commit -m "feat(remedy): article 28 clauses as one source for both forms"
```

---

## Task 3: Τύποι και context

**Files:**
- Create: `src/lib/remedy/types.ts`
- Create: `src/lib/remedy/context.ts`

- [ ] **Step 1: Γράψε τους τύπους**

```ts
// src/lib/remedy/types.ts
import type { IntakeGap } from "@prisma/client";
import type { Extraction } from "@/lib/intake/schemas";
import type { ComplianceProfile } from "@/lib/intake/compliance-profile";
import type { PartyRoleValue } from "@/lib/intake/role-mapping";
import type { PartySideValue } from "@/lib/intake/company-match";

export interface ContextParty {
  id: string;
  companyId: string | null;
  name: string;
  vat: string | null;
  address: string | null;
  email: string | null;
  representative: string | null;
  side: PartySideValue;
  role: PartyRoleValue | null;
}

export interface RemedyContext {
  intakeId: string;
  intakeTitle: string;
  userId: string;
  projectId: string | null;
  extraction: Extraction;
  profile: ComplianceProfile;
  /** Οι δικές μας εταιρίες, με τους επιβεβαιωμένους ρόλους τους. */
  ours: ContextParty[];
  /** Οι αντισυμβαλλόμενοι. */
  external: ContextParty[];
  /** Προμηθευτές που επεξεργάζονται δεδομένα — υποψήφιοι υποεκτελούντες. */
  dataProcessingVendors: string[];
}

export type RemedyResult =
  | { status: "CREATED"; entityType: string; entityId: string; fileUrl?: string; label: string }
  | { status: "NEEDS_HUMAN"; reason: string; href: string }
  | { status: "SKIPPED"; reason: string };

export type Remedy = (gap: IntakeGap, ctx: RemedyContext) => Promise<RemedyResult>;
```

- [ ] **Step 2: Γράψε το context**

```ts
// src/lib/remedy/context.ts
import { prisma } from "@/lib/prisma";
import { ExtractionSchema } from "@/lib/intake/schemas";
import { buildComplianceProfile, type ComplianceProfile } from "@/lib/intake/compliance-profile";
import type { RemedyContext, ContextParty } from "./types";

/**
 * Χτίζεται ΜΙΑ φορά ανά εκτέλεση, όχι ανά κενό: είκοσι κενά δεν πρέπει να
 * σημαίνουν είκοσι φορές το ίδιο query.
 */
export async function buildRemedyContext(intakeId: string, userId: string): Promise<RemedyContext> {
  const intake = await prisma.complianceIntake.findUniqueOrThrow({
    where: { id: intakeId },
    include: { parties: true },
  });

  const extraction = ExtractionSchema.parse(intake.extraction ?? {});
  const profile = (intake.profileSnapshot as ComplianceProfile | null) ?? (await buildComplianceProfile());

  const toParty = (p: (typeof intake.parties)[number]): ContextParty => ({
    id: p.id,
    companyId: p.companyId,
    name: p.extractedName,
    vat: p.extractedVat,
    address: p.extractedAddress,
    email: p.extractedEmail,
    representative: p.extractedRep,
    side: p.side as ContextParty["side"],
    role: p.confirmedRole as ContextParty["role"],
  });

  return {
    intakeId,
    intakeTitle: intake.title,
    userId,
    projectId: intake.projectId,
    extraction,
    profile,
    ours: intake.parties.filter((p) => p.side !== "EXTERNAL").map(toParty),
    external: intake.parties.filter((p) => p.side === "EXTERNAL").map(toParty),
    dataProcessingVendors: extraction.vendors
      .filter((v) => v.triage === "PROCESSES_DATA")
      .map((v) => v.name),
  };
}
```

- [ ] **Step 3: Επαλήθευσε**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/lib/remedy/types.ts src/lib/remedy/context.ts
git commit -m "feat(remedy): shared context and result types"
```

---

## Task 4: Οι εκτελεστές συμβάσεων

**Files:**
- Create: `src/lib/remedy/dpa.ts`

- [ ] **Step 1: Γράψε τον εκτελεστή**

Τρεις εξαγωγές, `createDpa`, `createContractClauses`, `createJca`, όλες `Remedy`.

Κοινή λογική, σε ιδιωτική συνάρτηση:
1. Βρες το ζεύγος: την πρώτη δική μας εταιρία με ρόλο, και το πρώτο `EXTERNAL` με ρόλο. Αν λείπει κάποιο, `SKIPPED` με ελληνικό λόγο.
2. Μετάφρασε το ζεύγος με `toDpaRole`. Αν `null`, `SKIPPED` — δεν στέκει σύμβαση άρθρου 28.
3. Ποιος είναι Controller και ποιος Processor προκύπτει από το `DpaRole`.
4. Κάλεσε `buildArticle28Clauses` με: `subject` από `extraction.subject`, `dataCategories` από την εξαγωγή, `purposes` από την εξαγωγή ή `[]`, `retentionPeriod` από `extraction.term` ή προεπιλογή, `subProcessors` από `ctx.dataProcessingVendors`, και τις σημαίες.

**`createDpa`** δημιουργεί `DpaContract` σε `PENDING` με τα πεδία των μερών, `dataCategories`, `purposes`, `retentionPeriod`, `safeguards` (η ρήτρα ασφάλειας), `subProcessors`, `roleInDpa`, και `projectId` — αν το intake δεν έχει ακόμη `projectId`, `SKIPPED` με λόγο «το έργο δημιουργείται στο βήμα 6». Μετά `buildDpaWord` → `uploadToBunny` σε `intake/<id>/dpa-<contractId>.docx` → ενημέρωσε `pdfUrl`.

**`createContractClauses`** δεν δημιουργεί `DpaContract`. Παράγει **μόνο** έγγραφο Word με τις ρήτρες αριθμημένες, το ανεβάζει, και επιστρέφει `CREATED` με `entityType: "ContractClauses"` και `entityId` το id του κενού. Το κείμενο αποθηκεύεται και στο `IntakeGap.remedyPayload` ώστε να μπορεί να αντιγραφεί από την οθόνη.

**`createJca`** ίδια δομή με `createDpa`, με `roleInDpa: "JOINT_CONTROLLERS"` και τίτλο «Συμφωνία από κοινού Υπευθύνων Επεξεργασίας (άρθρο 26)».

Για το Word των ρητρών χρησιμοποίησε απευθείας το `docx` όπως το `export-dpa-word.ts` — μια επικεφαλίδα και μετά αριθμημένες παράγραφοι `Άρθρο N — Τίτλος`.

- [ ] **Step 2: Επαλήθευσε build και commit**

```bash
npx tsc --noEmit && npx vitest run
git add src/lib/remedy/dpa.ts
git commit -m "feat(remedy): DPA, contract clauses and joint controller agreement"
```

---

## Task 5: DPIA και πολιτικές

**Files:**
- Create: `src/lib/remedy/dpia.ts`
- Create: `src/lib/remedy/policy.ts`

- [ ] **Step 1: DPIA**

`createDpia`: δημιουργεί `DpiaReport` σε `DRAFT` με `processingPurpose` από το `extraction.subject`, `projectId` από το context. Για κινδύνους και μέτρα καλεί το DeepSeek μέσω `deepseekJson`, με prompt που δίνει το αντικείμενο, τις κατηγορίες δεδομένων, τους υποεκτελούντες και τη σημαία ειδικών κατηγοριών, και ζητά `{ risksIdentified: string[], riskMitigation: string[], riskLikelihood: 1-5, riskImpact: 1-5, riskReasoning: string }`. Επικύρωσε με Zod πριν αποθηκεύσεις. Μετά `buildDpiaWord` → `uploadToBunny` → `pdfUrl`.

Αν το DeepSeek αποτύχει δύο φορές, **μη ματαιώσεις το DPIA**: δημιούργησέ το χωρίς κινδύνους και επίστρεψε `CREATED` με `label` που το λέει — ένα κενό DPIA που ο χρήστης συμπληρώνει είναι χρησιμότερο από κανένα.

- [ ] **Step 2: Πολιτικές**

`createPolicy`: το `gap.policyType` λέει ποια. Αν είναι `null`, `SKIPPED`. Αν υπάρχει ήδη `PolicyDocument` αυτού του τύπου σε `ACTIVE`, `SKIPPED` με λόγο. Αλλιώς καλεί το DeepSeek για το περιεχόμενο, δίνοντας τα στοιχεία του οργανισμού από το `profile`, και δημιουργεί `PolicyDocument` σε `DRAFT` με `version: "1.0"`.

- [ ] **Step 3: Επαλήθευσε και commit**

```bash
npx tsc --noEmit && npx vitest run
git add src/lib/remedy/dpia.ts src/lib/remedy/policy.ts
git commit -m "feat(remedy): DPIA and policy generation from engagement data"
```

---

## Task 6: Ό,τι χρειάζεται άνθρωπο

**Files:**
- Create: `src/lib/remedy/manual.ts`
- Test: `src/lib/remedy/manual.test.ts`

- [ ] **Step 1: Γράψε τους και τα tests**

Τέσσερις εκτελεστές που επιστρέφουν `NEEDS_HUMAN` με σαφή λόγο και σύνδεσμο:

| Εκτελεστής | `reason` | `href` |
|---|---|---|
| `assignDpo` | «Ο ορισμός Υπευθύνου Προστασίας Δεδομένων είναι διορισμός προσώπου με ευθύνη έναντι της Αρχής — δεν γίνεται αυτόματα.» | `/admin/positions` |
| `createTraining` | «Η εκπαίδευση απαιτεί να οριστεί ποιοι εργαζόμενοι θα τη λάβουν.» | `/admin/training` |
| `createRopaEntry` | «Η καταχώριση RoPA χρειάζεται να δηλωθεί σε ποιο τμήμα ανήκει η δραστηριότητα.» | `/mapper` |
| `createAssessment` | «Η αξιολόγηση δημιουργήθηκε· οι απαντήσεις δίνονται από άνθρωπο.» | `/assessment` |

Το `createAssessment` **δημιουργεί** πρώτα `Assessment` σε `DRAFT` και μετά επιστρέφει `NEEDS_HUMAN` — η οντότητα υπάρχει, οι απαντήσεις λείπουν. Επίστρεψε το `entityId` στο `reason` ώστε το UI να συνδέσει σωστά.

Test: κάθε ένας επιστρέφει `NEEDS_HUMAN`, με μη κενό `reason` και `href` που ξεκινά με `/`.

- [ ] **Step 2: Commit**

```bash
git add src/lib/remedy/manual.ts src/lib/remedy/manual.test.ts
git commit -m "feat(remedy): surface what needs a human instead of faking it"
```

---

## Task 7: Το μητρώο και η εκτέλεση

**Files:**
- Create: `src/lib/remedy/index.ts`
- Test: `src/lib/remedy/index.test.ts`
- Create: `src/actions/remedy.ts`

- [ ] **Step 1: Το μητρώο**

```ts
// src/lib/remedy/index.ts
const REGISTRY: Record<string, Remedy> = {
  CREATE_DPA: createDpa,
  CREATE_CONTRACT_CLAUSES: createContractClauses,
  CREATE_JCA: createJca,
  CREATE_DPIA: createDpia,
  CREATE_POLICY: createPolicy,
  CREATE_ROPA_ENTRY: createRopaEntry,
  CREATE_ASSESSMENT: createAssessment,
  ASSIGN_DPO: assignDpo,
  CREATE_TRAINING: createTraining,
};

export async function executeRemedy(gap: IntakeGap, ctx: RemedyContext): Promise<RemedyResult> {
  if (!gap.remedyType) return { status: "SKIPPED", reason: "Το κενό δεν έχει προτεινόμενη κάλυψη." };
  // Ιδιοτροπία: ο χρήστης ΘΑ πατήσει «Κάλυψη όλων» δεύτερη φορά.
  if (gap.createdEntityId) return { status: "SKIPPED", reason: "Έχει ήδη καλυφθεί." };
  const remedy = REGISTRY[gap.remedyType];
  if (!remedy) return { status: "SKIPPED", reason: `Άγνωστος τύπος κάλυψης: ${gap.remedyType}` };
  return remedy(gap, ctx);
}
```

**Test που κλειδώνει την πληρότητα:**

```ts
it("το μητρώο καλύπτει κάθε τιμή του RemedyType", async () => {
  const { RemedyType } = await import("@prisma/client");
  for (const t of Object.keys(RemedyType)) {
    expect(REGISTRY_KEYS).toContain(t);
  }
});
```

Εξήγαγε `REGISTRY_KEYS` γι' αυτό. Αν κάποιος προσθέσει δέκατο τύπο χωρίς εκτελεστή, το test το πιάνει αντί να το ανακαλύψει ο χρήστης.

Επίσης test ότι κενό με `createdEntityId` επιστρέφει `SKIPPED` χωρίς να καλέσει εκτελεστή.

- [ ] **Step 2: Οι ενέργειες**

```ts
// src/actions/remedy.ts — υπογραφές
export async function executeGapRemedy(gapId: string): Promise<RemedyResult>
export async function executeAllRemedies(intakeId: string): Promise<Record<string, RemedyResult>>
export async function setDpaForm(gapId: string, form: "STANDALONE" | "CLAUSES"): Promise<void>
```

`executeAllRemedies` χτίζει το context **μία φορά**, τρέχει τα κενά **σειριακά** (κάθε ένα καλεί AI· παράλληλα θα χτυπούσε rate limits), και μετά από κάθε επιτυχία ενημερώνει το κενό σε `DRAFTED` με `createdEntityType`/`createdEntityId`. Καταγράφει στο `AuditLog` ανά κενό.

`setDpaForm` εναλλάσσει `remedyType` ανάμεσα σε `CREATE_DPA` και `CREATE_CONTRACT_CLAUSES` — οι δύο μορφές είναι εναλλακτικές.

Όλες απαιτούν `requireUserId()`.

- [ ] **Step 3: Επαλήθευσε και commit**

```bash
npx tsc --noEmit && npx vitest run && npm run build
git add src/lib/remedy/index.ts src/lib/remedy/index.test.ts src/actions/remedy.ts
git commit -m "feat(remedy): registry and execution actions"
```

---

## Task 8: UI στο βήμα 5

**Files:**
- Modify: `src/app/(app)/intake/[id]/step-gaps.tsx`

- [ ] **Step 1: Πρόσθεσε τα στοιχεία**

- Κουμπί **«Κάλυψη όλων»** πάνω από τη λίστα, με ένδειξη προόδου όσο τρέχει. Προειδοποίησε ότι διαρκεί: κάθε κενό με AI είναι 10–30 δευτερόλεπτα.
- Ανά κενό με `remedyType` `CREATE_DPA` ή `CREATE_CONTRACT_CLAUSES`, **επιλογή μορφής** (αυτοτελές παράρτημα / ρήτρες στη σύμβαση) που καλεί `setDpaForm`.
- Μετά την εκτέλεση, ανά κενό: **Δημιουργήθηκε** με σύνδεσμο και κατέβασμα· **Απαιτεί απόφαση** με τον λόγο και τον σύνδεσμο· **Παραλείφθηκε** με τον λόγο.
- Για τις ρήτρες, κουμπί «Αντιγραφή κειμένου» που παίρνει το `remedyPayload`.

- [ ] **Step 2: Επαλήθευσε**

```bash
npx tsc --noEmit && npm run build && npx vitest run
npx eslint "src/app/(app)/intake" src/lib/remedy src/actions/remedy.ts
```

- [ ] **Step 3: Commit**

---

## Task 9: Δοκιμή σε πραγματικά δεδομένα

- [ ] **Step 1: Χρησιμοποίησε το υπάρχον intake**

Στη βάση υπάρχει «Δοκιμή — Πρόταση B2B ΔΩΔΩΝΗ» με 5 κενά. **Μη δημιουργήσεις νέο.**

- [ ] **Step 2: Αγκύρωσε τα μέρη από το UI**

Χρειάζεται δική μας εταιρία και αντισυμβαλλόμενος με έγκυρο ζεύγος ρόλων, αλλιώς οι εκτελεστές συμβάσεων θα επιστρέψουν `SKIPPED`.

- [ ] **Step 3: Πάτα «Κάλυψη όλων» και κατάγραψε**

Ανά κενό: τι επέστρεψε, πόσο κράτησε, και **άνοιξε το παραγόμενο Word** για να δεις αν οι κατηγορίες δεδομένων και οι υποεκτελούντες είναι πραγματικοί ή placeholders. Αυτό είναι το κριτήριο.

- [ ] **Step 4: Πάτα δεύτερη φορά**

Όλα πρέπει να γυρίσουν `SKIPPED: Έχει ήδη καλυφθεί.` Καμία διπλοεγγραφή.

- [ ] **Step 5: Ανάφερε πριν προχωρήσεις σε commit του έργου**

**ΜΗΝ** πατήσεις «Δημιουργία έργου».

---

## Έλεγχος πληρότητας

- [ ] `npx tsc --noEmit`, `npx vitest run`, `npm run build` καθαρά
- [ ] Το test πληρότητας μητρώου περνά για όλες τις 9 τιμές
- [ ] Δεύτερη εκτέλεση δεν παράγει τίποτα
- [ ] Το παραγόμενο DPA περιέχει πραγματικές κατηγορίες δεδομένων από το έγγραφο
