# Κύκλωμα Υπογραφής (Στάδιο 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Στέλνει τα παραγόμενα έγγραφα προς υπογραφή, παρακολουθεί ποιος υπέγραψε, υπενθυμίζει, και κλείνει το έργο όταν όλα είναι εντάξει.

**Architecture:** Ένα `SignatureRequest` ανά έγγραφο και παραλήπτη, με token που ζει σε δημόσια σελίδα εκτός auth. Ο παραλήπτης είτε επιβεβαιώνει ηλεκτρονικά — καταγράφοντας χρόνο, IP και δηλωθέντα υπογράφοντα — είτε ανεβάζει υπογεγραμμένο PDF. Το κλείσιμο του έργου κρίνεται από καθαρή συνάρτηση, όπως το commit.

**Tech Stack:** Next.js 16.2, Prisma 5 + MySQL, Mailgun μέσω `lib/mail.ts`, Bunny CDN, vitest.

**Spec:** `docs/superpowers/specs/2026-08-10-signature-workflow-design.md`

---

## Η δικλείδα, πριν από όλα

Τα email πάνε σε **πραγματικούς πελάτες**. Η `SIGNATURE_TEST_RECIPIENT` είναι ήδη ορισμένη στο `.env` και **κάθε** μήνυμα πρέπει να ανακατευθύνεται εκεί όσο υπάρχει. Αυτό υλοποιείται στο **Task 2, πριν** γραφτεί οποιαδήποτε ενέργεια αποστολής, και δοκιμάζεται.

Κανείς δεν στέλνει τίποτα σε πραγματική διεύθυνση σε αυτό το plan.

## Δομή αρχείων

| Αρχείο | Ευθύνη |
|---|---|
| `prisma/schema.prisma` | `SignatureRequest` + `SignatureStatus` |
| `src/lib/signature/recipient.ts` | Η δικλείδα ανακατεύθυνσης — καθαρή συνάρτηση |
| `src/lib/signature/completion.ts` | `canCompleteProject` — καθαρή συνάρτηση |
| `src/lib/signature/email.ts` | Τα τρία πρότυπα μηνυμάτων |
| `src/actions/signature.ts` | create, send, resend, cancel, completeProject |
| `src/app/(public)/sign/[token]/page.tsx` | Η δημόσια σελίδα υπογραφής |
| `src/app/(public)/sign/[token]/sign-form.tsx` | Επιβεβαίωση ή ανέβασμα |
| `src/app/api/sign/[token]/route.ts` | Υποβολή υπογραφής |
| `src/app/api/cron/signature-reminders/route.ts` | Υπενθυμίσεις και λήξεις |
| `src/app/(app)/dev/projects/[id]/signatures.tsx` | Πίνακας παρακολούθησης |

---

## Task 1: Σχήμα

**Files:** Modify `prisma/schema.prisma`

- [ ] **Step 1: Πρόσθεσε το enum και το μοντέλο** ακριβώς όπως στο spec, ενότητα «Μοντέλο δεδομένων».

- [ ] **Step 2: Back-relations**

Στο `model Project`: `signatureRequests SignatureRequest[]`
Στο `model Company`: `signatureRequests SignatureRequest[]`

- [ ] **Step 3: Εφάρμοσε**

Run: `npx prisma db push && npx prisma generate`

**Προσθήκη μόνο.** Αν προταθεί οτιδήποτε καταστροφικό, σταμάτα και ανάφερε BLOCKED.

- [ ] **Step 4: Επανεκκίνησε τον dev server**

Ο Next κρατά τον Prisma Client που φόρτωσε στην εκκίνηση. Κάθε νέο μοντέλο ή τιμή enum απαιτεί restart — **δύο φορές σε αυτό το έργο χάθηκε χρόνος σε αυτό**. Χρησιμοποίησε `preview_stop` και `preview_start`, όχι `npm run dev`.

- [ ] **Step 5: Επιβεβαίωσε**

Run: `npx tsx -e "import {PrismaClient} from '@prisma/client'; const p=new PrismaClient(); p.signatureRequest.count().then(n=>{console.log('αιτήματα:',n); return p.\$disconnect()})"`
Expected: `αιτήματα: 0`

- [ ] **Step 6: Commit** — `feat(signature): schema for signature requests`

---

## Task 2: Η δικλείδα αποστολής

Πρώτα η ασφάλεια, μετά η λειτουργία.

**Files:** Create `src/lib/signature/recipient.ts` + test

- [ ] **Step 1: Γράψε το failing test**

```ts
// src/lib/signature/recipient.test.ts
import { describe, it, expect } from "vitest";
import { resolveRecipient } from "./recipient";

const real = { name: "Δημήτριος Κολλέρης", email: "d.kolleris@example.gr" };

describe("resolveRecipient", () => {
  it("χωρίς ανακατεύθυνση στέλνει στον πραγματικό παραλήπτη", () => {
    const r = resolveRecipient(real, undefined);
    expect(r.to).toBe("d.kolleris@example.gr");
    expect(r.redirected).toBe(false);
    expect(r.notice).toBeNull();
  });

  it.each(["", "   "])("κενή μεταβλητή (%p) δεν ανακατευθύνει", (v) => {
    expect(resolveRecipient(real, v).redirected).toBe(false);
  });

  it("με ανακατεύθυνση στέλνει ΜΟΝΟ εκεί", () => {
    const r = resolveRecipient(real, "test@i4ria.com");
    expect(r.to).toBe("test@i4ria.com");
    expect(r.redirected).toBe(true);
  });

  it("η προειδοποίηση λέει πού θα πήγαινε κανονικά", () => {
    const r = resolveRecipient(real, "test@i4ria.com");
    expect(r.notice).toContain("d.kolleris@example.gr");
    expect(r.notice).toContain("Δημήτριος Κολλέρης");
    expect(r.notice).toMatch(/δοκιμ/i);
  });

  it("καθαρίζει κενά γύρω από τη διεύθυνση", () => {
    expect(resolveRecipient(real, "  test@i4ria.com  ").to).toBe("test@i4ria.com");
  });

  it("ΠΟΤΕ δεν επιστρέφει τον πραγματικό παραλήπτη όταν η ανακατεύθυνση είναι ενεργή", () => {
    // Ο πιο σημαντικός ισχυρισμός του αρχείου.
    for (const email of ["a@b.gr", "ΚΕΦΑΛΑΙΑ@B.GR", "  c@d.gr "]) {
      const r = resolveRecipient({ name: "Χ", email }, "guard@i4ria.com");
      expect(r.to).toBe("guard@i4ria.com");
      expect(r.to).not.toBe(email.trim());
    }
  });
});
```

- [ ] **Step 2:** τρέξε, δες αποτυχία.

- [ ] **Step 3: Γράψε την υλοποίηση**

```ts
// src/lib/signature/recipient.ts

/**
 * Πού πάει πραγματικά ένα email υπογραφής.
 *
 * Τα μηνύματα αυτού του σταδίου απευθύνονται σε πελάτες, και μια λάθος
 * αποστολή δεν ανακαλείται. Η δικλείδα είναι μηχανισμός, όχι προσοχή: όσο η
 * `SIGNATURE_TEST_RECIPIENT` υπάρχει, τίποτα δεν φτάνει σε τρίτον.
 *
 * Καθαρή συνάρτηση, ώστε ο ισχυρισμός «ποτέ δεν διαρρέει» να δοκιμάζεται.
 */

export interface Recipient {
  name: string;
  email: string;
}

export interface ResolvedRecipient {
  to: string;
  redirected: boolean;
  /** Μπαίνει στην κορυφή του μηνύματος όταν υπάρχει ανακατεύθυνση. */
  notice: string | null;
}

export function resolveRecipient(
  intended: Recipient,
  override: string | undefined | null
): ResolvedRecipient {
  const guard = override?.trim();
  if (!guard) {
    return { to: intended.email.trim(), redirected: false, notice: null };
  }
  return {
    to: guard,
    redirected: true,
    notice:
      `⚠ ΔΟΚΙΜΑΣΤΙΚΗ ΑΠΟΣΤΟΛΗ — το κανονικό μήνυμα θα πήγαινε στον/στην ` +
      `«${intended.name}» <${intended.email.trim()}>.`,
  };
}

/** Η τρέχουσα ρύθμιση, για να τη δείχνει και το UI. */
export function signatureTestRecipient(): string | null {
  return process.env.SIGNATURE_TEST_RECIPIENT?.trim() || null;
}
```

- [ ] **Step 4:** τρέξε, δες επιτυχία — 7 tests.

- [ ] **Step 5: Commit** — `feat(signature): redirect guard so nothing reaches a real client`

---

## Task 3: Ο κανόνας κλεισίματος

**Files:** Create `src/lib/signature/completion.ts` + test

- [ ] **Step 1: Το test**

```ts
// src/lib/signature/completion.test.ts
import { describe, it, expect } from "vitest";
import { canCompleteProject, type SignatureState, type GapState } from "./completion";

const signed: SignatureState = { status: "SIGNED", recipientName: "Α", declineReason: null };
const critical = (status: string): GapState => ({ severity: "CRITICAL", status, dismissReason: null });

describe("canCompleteProject", () => {
  it("επιτρέπει όταν όλα υπογράφηκαν και τα κρίσιμα λύθηκαν", () => {
    expect(canCompleteProject([signed], [critical("RESOLVED")])).toEqual({ allowed: true, reasons: [] });
  });

  it("επιτρέπει έργο χωρίς υπογραφές και χωρίς κρίσιμα κενά", () => {
    expect(canCompleteProject([], []).allowed).toBe(true);
  });

  it.each(["PENDING", "SENT", "VIEWED"])("μπλοκάρει όσο μια υπογραφή είναι %s", (status) => {
    const r = canCompleteProject([{ ...signed, status }], []);
    expect(r.allowed).toBe(false);
    expect(r.reasons.join()).toMatch(/υπογραφ/i);
  });

  it("μπλοκάρει σε άρνηση και αναφέρει τον λόγο", () => {
    const r = canCompleteProject(
      [{ status: "DECLINED", recipientName: "Κολλέρης", declineReason: "Θέλουμε αλλαγή στο άρθρο 5" }],
      []
    );
    expect(r.allowed).toBe(false);
    expect(r.reasons.join()).toContain("Κολλέρης");
    expect(r.reasons.join()).toContain("άρθρο 5");
  });

  it("μπλοκάρει σε ληγμένη υπογραφή", () => {
    expect(canCompleteProject([{ ...signed, status: "EXPIRED" }], []).allowed).toBe(false);
  });

  it.each(["OPEN", "DRAFTED"])("μπλοκάρει κρίσιμο κενό σε %s — εδώ δεν αρκεί το πρόχειρο", (status) => {
    const r = canCompleteProject([], [critical(status)]);
    expect(r.allowed).toBe(false);
    expect(r.reasons.join()).toMatch(/κρίσιμ/i);
  });

  it("το DISMISSED με αιτιολογία περνά", () => {
    const gap: GapState = { severity: "CRITICAL", status: "DISMISSED", dismissReason: "Καλύπτεται αλλού" };
    expect(canCompleteProject([], [gap]).allowed).toBe(true);
  });

  it("το DISMISSED χωρίς αιτιολογία δεν περνά", () => {
    const gap: GapState = { severity: "CRITICAL", status: "DISMISSED", dismissReason: "  " };
    expect(canCompleteProject([], [gap]).allowed).toBe(false);
  });

  it("τα μη κρίσιμα κενά δεν εμποδίζουν το κλείσιμο", () => {
    for (const severity of ["HIGH", "MEDIUM", "LOW"]) {
      expect(canCompleteProject([], [{ severity, status: "OPEN", dismissReason: null }]).allowed).toBe(true);
    }
  });

  it("συγκεντρώνει όλους τους λόγους", () => {
    const r = canCompleteProject([{ ...signed, status: "PENDING" }], [critical("OPEN")]);
    expect(r.reasons.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2–3:** αποτυχία, μετά υλοποίηση.

Το `canCompleteProject(signatures, gaps)` επιστρέφει `{ allowed, reasons[] }`. Είναι **αυστηρότερο** από το `canCommit`: εκεί αρκούσε να υπάρχει προτεινόμενη κάλυψη, εδώ πρέπει να έχει εκτελεστεί (`RESOLVED`) και υπογραφεί. Τα μηνύματα γράφονται στα ελληνικά και τυπώνονται αυτούσια από το UI.

- [ ] **Step 4: Commit** — `feat(signature): project completion rule`

---

## Task 4: Πρότυπα μηνυμάτων

**Files:** Create `src/lib/signature/email.ts`

Τρία πρότυπα, στο ύφος του `src/lib/consent-email.ts` (διάβασέ το πρώτα):

| Πρότυπο | Πότε |
|---|---|
| `signatureRequestEmail` | Πρώτη αποστολή |
| `signatureReminderEmail` | Υπενθύμιση, με αριθμό προσπάθειας |
| `signatureConfirmedEmail` | Επιβεβαίωση προς τον υπογράψαντα μετά την υπογραφή |

Κάθε πρότυπο δέχεται `notice: string | null` και, όταν δεν είναι null, το εμφανίζει **στην κορυφή**, ευδιάκριτα. Δέχεται επίσης το όνομα του εγγράφου, τα μέρη, τον σύνδεσμο και την ημερομηνία λήξης.

Το κείμενο πρέπει να λέει καθαρά **τι υπογράφεται και μεταξύ ποιων** — ο παραλήπτης μπορεί να μη θυμάται τη συνεργασία.

- [ ] **Commit** — `feat(signature): email templates`

---

## Task 5: Ενέργειες

**Files:** Create `src/actions/signature.ts`

```ts
export async function createSignatureRequests(projectId: string): Promise<number>
export async function sendSignatureRequest(requestId: string): Promise<{ to: string; redirected: boolean }>
export async function resendSignatureRequest(requestId: string): Promise<{ to: string; redirected: boolean }>
export async function cancelSignatureRequest(requestId: string, reason: string): Promise<void>
export async function completeProject(projectId: string): Promise<void>
```

`createSignatureRequests` σαρώνει τα `DpaContract` του έργου που δεν είναι `SIGNED` και δημιουργεί ένα αίτημα ανά αντισυμβαλλόμενο, με token από `generateConsentToken()` και `expiresAt` από `SIGNATURE_EXPIRY_DAYS` (προεπιλογή 30). Ιδιοτροπία: δεν δημιουργεί δεύτερο αίτημα για έγγραφο που έχει ήδη ένα σε εκκρεμότητα.

Ο παραλήπτης προκύπτει από το `Company.contactEmail` ή `Company.email`. **Αν λείπει διεύθυνση, το αίτημα δημιουργείται σε `PENDING` αλλά δεν στέλνεται**, και το UI ζητά email — καλύτερα από σιωπηλή αποτυχία.

`sendSignatureRequest` περνά υποχρεωτικά από `resolveRecipient` και καταγράφει στο `AuditLog` **και** τον πραγματικό παραλήπτη **και** πού στάλθηκε.

`completeProject` ελέγχει `canCompleteProject` και αρνείται με τους λόγους. Θέτει `Project.status = COMPLETED`.

Όλες απαιτούν `requireUserId()`.

- [ ] **Commit** — `feat(signature): actions for requesting and completing`

---

## Task 6: Η δημόσια σελίδα

**Files:**
- `src/app/(public)/sign/[token]/page.tsx`
- `src/app/(public)/sign/[token]/sign-form.tsx`
- `src/app/api/sign/[token]/route.ts`

Η σελίδα δείχνει: τι υπογράφεται, μεταξύ ποιων, σύνδεσμο κατεβάσματος, και τη φόρμα. **Τίποτε άλλο από το σύστημα** — ούτε κενά, ούτε προφίλ, ούτε άλλα έργα.

Στο άνοιγμα, αν είναι `SENT`, γίνεται `VIEWED` με `viewedAt`.

Η φόρμα έχει δύο δρόμους:
- **Ηλεκτρονική υπογραφή** — ονοματεπώνυμο, ιδιότητα, και υποχρεωτικό checkbox «δεσμεύω νόμιμα την εταιρία». Δίπλα, με μικρά γράμματα, ότι καταγράφονται χρόνος, IP και συσκευή.
- **Ανέβασμα υπογεγραμμένου** — PDF έως 20 MB στο Bunny.

Υπάρχει και **άρνηση** με υποχρεωτικό λόγο.

**Ασφάλεια — μη το παρακάμψεις:**
- Άγνωστο, ληγμένο, ακυρωμένο ή ήδη υπογεγραμμένο token δίνει **την ίδια** ουδέτερη σελίδα: «Ο σύνδεσμος δεν είναι πλέον ενεργός.» Καμία διάκριση, καμία απαρίθμηση.
- Το POST ξαναελέγχει την εγκυρότητα· δεν εμπιστεύεται ότι η σελίδα φορτώθηκε.
- `getClientIp` και user-agent καταγράφονται στην υπογραφή.
- Με την υπογραφή, το αντίστοιχο `DpaContract` γίνεται `SIGNED` με `signedAt`.

- [ ] **Commit** — `feat(signature): public signing page with token`

---

## Task 7: Υπενθυμίσεις

**Files:** `src/app/api/cron/signature-reminders/route.ts` (δες τα υπάρχοντα στο `api/cron`)

Αιτήματα σε `SENT` ή `VIEWED` με `lastReminder` (ή `sentAt`) παλαιότερο των **7 ημερών** και `reminderCount < 3` παίρνουν υπενθύμιση. Όσα πέρασαν το `expiresAt` γίνονται `EXPIRED`.

Περνά κι αυτό από `resolveRecipient` — η δικλείδα ισχύει και εδώ, ίσως περισσότερο: μια cron που στέλνει μόνη της είναι ακριβώς ο τρόπος να φύγει κάτι κατά λάθος.

- [ ] **Commit** — `feat(signature): reminder and expiry job`

---

## Task 8: Πίνακας παρακολούθησης

**Files:** `src/app/(app)/dev/projects/[id]/signatures.tsx` και σύνδεσή του στη σελίδα του έργου

Ανά αίτημα: έγγραφο, παραλήπτης, κατάσταση ως badge, χρόνοι αποστολής/προβολής/υπογραφής, πλήθος υπενθυμίσεων. Ενέργειες: αποστολή, επαναποστολή, ακύρωση, κατέβασμα υπογεγραμμένου.

**Το κουμπί αποστολής δείχνει τη δικλείδα.** Όταν η `SIGNATURE_TEST_RECIPIENT` είναι ενεργή, γράφει «Αποστολή (δοκιμαστικά σε gkozyris@i4ria.com)». Ο έλεγχος γίνεται server-side με `signatureTestRecipient()`.

Κάτω, το κλείσιμο έργου με το `canCompleteProject` — λόγοι αυτούσιοι, κουμπί ανενεργό όσο υπάρχουν.

- [ ] **Commit** — `feat(signature): tracking table and project completion`

---

## Task 9: Δοκιμή από άκρη σε άκρη

Υπάρχει έργο «Καθαρός κύκλος — σύμβαση CRM» με ένα `DpaContract` και παραγόμενο Word.

- [ ] **Step 1: Επιβεβαίωσε τη δικλείδα ΠΡΙΝ στείλεις**

Run: `npx tsx -e "console.log(process.env.SIGNATURE_TEST_RECIPIENT)"` με φορτωμένο το `.env`.
Πρέπει να τυπώσει `gkozyris@i4ria.com`. **Αν είναι κενό, ΣΤΑΜΑΤΑ.**

- [ ] **Step 2:** δημιούργησε τα αιτήματα και στείλε **ένα**.

- [ ] **Step 3:** επιβεβαίωσε στο `AuditLog` ότι ο πραγματικός παραλήπτης καταγράφηκε και ότι στάλθηκε στη διεύθυνση δοκιμής.

- [ ] **Step 4:** άνοιξε τον σύνδεσμο, υπόγραψε ηλεκτρονικά, επιβεβαίωσε ότι καταγράφηκαν IP και υπογράφων και ότι το `DpaContract` έγινε `SIGNED`.

- [ ] **Step 5:** δοκίμασε άκυρο token — πρέπει να δίνει την ίδια ουδέτερη σελίδα με ληγμένο.

- [ ] **Step 6:** δοκίμασε κλείσιμο έργου με εκκρεμές κρίσιμο κενό — πρέπει να αρνείται με λόγο.

---

## Έλεγχος πληρότητας

- [ ] `npx tsc --noEmit`, `npx vitest run`, `npm run build` καθαρά
- [ ] Καμία αποστολή σε διεύθυνση εκτός της `SIGNATURE_TEST_RECIPIENT`
- [ ] Άκυρο και ληγμένο token δίνουν πανομοιότυπη απάντηση
- [ ] Το έργο δεν κλείνει με εκκρεμή υπογραφή ή κρίσιμο κενό
