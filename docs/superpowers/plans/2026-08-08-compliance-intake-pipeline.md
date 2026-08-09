# Compliance Intake — Αγωγός Πρόσληψης (Στάδιο 1α) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Χτίζει τον αγωγό που διαβάζει μια σκαναρισμένη σύμβαση, εξάγει τα συμβαλλόμενα μέρη, ξεχωρίζει τις εταιρίες του ομίλου από τους τρίτους, και προτείνει ρόλο GDPR ανά μέρος — δοκιμάσιμος από άκρη σε άκρη χωρίς καθόλου UI.

**Architecture:** Οκτώ στάδια πάνω από μια εγγραφή `ComplianceIntake` που κρατά την κατάσταση στη βάση, άρα διακόπτεται και συνεχίζεται. Το Gemini διαβάζει pixel (OCR + δομημένη εξαγωγή)· το DeepSeek κρίνει νομικά. Ανάμεσά τους παρεμβάλλονται **καθαρές συναρτήσεις χωρίς AI** — πύλη ποιότητας, κανονικοποίηση ΑΦΜ, αντιστοίχιση εταιριών — που δοκιμάζονται χωρίς κανένα API call. Κάθε AI έξοδος περνά από Zod πριν αγγίξει τη βάση.

**Tech Stack:** Next.js 16.2, Prisma 5 + MySQL, Zod 4, vitest 2, Gemini REST API (`generativelanguage.googleapis.com`), DeepSeek (υπάρχον `lib/deepseek.ts`), Bunny CDN (υπάρχον `lib/bunny.ts`), `mammoth` για DOCX.

**Spec:** `docs/superpowers/specs/2026-08-08-compliance-intake-wizard-design.md`

**Τι ΔΕΝ καλύπτει:** το UI του wizard (επόμενο plan, «Στάδιο 1β»), την παραγωγή περιεχομένου εγγράφων (Στάδιο 2), το κύκλωμα υπογραφής (Στάδιο 3).

---

## Δομή αρχείων

| Αρχείο | Ευθύνη |
|---|---|
| `prisma/schema.prisma` | 4 μοντέλα + 10 enums (τροποποίηση) |
| `src/lib/gemini.ts` | Πελάτης Gemini REST — κείμενο και συνημμένα αρχεία |
| `src/lib/intake/vat.ts` | Κανονικοποίηση και επικύρωση ΑΦΜ |
| `src/lib/intake/company-match.ts` | Αντιστοίχιση μερών με `Company` / όμιλο → `PartySide` |
| `src/lib/intake/quality-gate.ts` | Βαθμός ποιότητας OCR → κλιμάκωση |
| `src/lib/intake/role-mapping.ts` | `PartyRole` ζεύγη → `DpaRole` |
| `src/lib/intake/blocking-rule.ts` | Πότε επιτρέπεται το commit |
| `src/lib/intake/schemas.ts` | Zod schemas για τις εξόδους των AI |
| `src/lib/intake/ocr.ts` | ③④ OCR με κλιμάκωση + καταμέτρηση σελίδων |
| `src/lib/intake/extraction.ts` | ⑤ Δομημένη εξαγωγή |
| `src/lib/intake/compliance-profile.ts` | Προφίλ συμμόρφωσης ομίλου (queries) |
| `src/lib/intake/reasoning.ts` | ⑦ Νομική κρίση (DeepSeek) |
| `src/actions/intake.ts` | Server actions: create, upload, confirm, commit |

**Κανόνας:** τα αρχεία σε `src/lib/intake/` με επίθεμα `.test.ts` δίπλα τους. Το `vitest.config.ts` ήδη πιάνει `src/**/*.test.ts` — καμία αλλαγή ρύθμισης.

---

## Task 1: Σχήμα βάσης

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Πρόσθεσε τα enums στο τέλος του `prisma/schema.prisma`**

```prisma
// ─── Compliance Intake (Wizard Στάδιο 1) ─────────────────────────────────────

enum IntakeStatus {
  DRAFT
  PROCESSING
  AWAITING_REVIEW
  COMMITTED
  FAILED
  CANCELLED
}

enum OcrStatus {
  PENDING
  RUNNING
  DONE
  FAILED
}

enum IntakeStage {
  UPLOAD
  OCR
  EXTRACTION
  MATCHING
  REASONING
  REVIEW
}

enum DocumentKind {
  CONTRACT
  OFFER
  ANNEX
  CORRESPONDENCE
  OTHER
}

enum MatchMethod {
  VAT
  NAME
  MANUAL
  NONE
}

enum PartySide {
  OWN_MOTHER
  OWN_GROUP
  EXTERNAL
}

enum PartyRole {
  CONTROLLER
  PROCESSOR
  JOINT_CONTROLLER
  SUB_PROCESSOR
  RECIPIENT
  THIRD_PARTY
}

enum GapCategory {
  POLICY
  DPIA
  ROPA
  TRAINING
  TECHNICAL
  CONTRACT
  DPO
}

enum GapSeverity {
  CRITICAL
  HIGH
  MEDIUM
  LOW
}

enum RemedyType {
  CREATE_POLICY
  CREATE_DPIA
  CREATE_DPA
  CREATE_JCA
  CREATE_ROPA_ENTRY
  CREATE_ASSESSMENT
  ASSIGN_DPO
  CREATE_TRAINING
}

enum GapStatus {
  OPEN
  DRAFTED
  RESOLVED
  DISMISSED
}
```

- [ ] **Step 2: Πρόσθεσε τα μοντέλα κάτω από τα enums**

```prisma
model ComplianceIntake {
  id              String        @id @default(cuid())
  userId          String
  title           String
  status          IntakeStatus  @default(DRAFT)
  stage           IntakeStage   @default(UPLOAD)

  extraction      Json?
  reasoning       Json?
  profileSnapshot Json?

  projectId       String?
  lastError       String?       @db.Text

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User             @relation(fields: [userId], references: [id])
  project   Project?         @relation(fields: [projectId], references: [id])
  documents IntakeDocument[]
  parties   IntakeParty[]
  gaps      IntakeGap[]

  @@index([status])
  @@index([userId, status])
}

model IntakeDocument {
  id         String       @id @default(cuid())
  intakeId   String
  fileName   String
  fileUrl    String
  fileHash   String
  mimeType   String
  sizeBytes  Int
  pageCount  Int?
  kind       DocumentKind @default(CONTRACT)

  ocrText    String?      @db.LongText
  ocrModel   String?
  ocrQuality Float?
  escalated  Boolean      @default(false)
  ocrStatus  OcrStatus    @default(PENDING)
  ocrError   String?      @db.Text

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  intake ComplianceIntake @relation(fields: [intakeId], references: [id], onDelete: Cascade)

  @@index([fileHash])
}

model IntakeParty {
  id               String      @id @default(cuid())
  intakeId         String
  companyId        String?
  side             PartySide   @default(EXTERNAL)

  extractedName    String
  extractedVat     String?
  extractedAddress String?     @db.Text
  extractedRep     String?
  extractedEmail   String?

  matchMethod      MatchMethod @default(NONE)
  matchScore       Float?

  proposedRole     PartyRole?
  confirmedRole    PartyRole?
  roleRationale    String?     @db.Text
  gdprArticles     Json?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  intake  ComplianceIntake @relation(fields: [intakeId], references: [id], onDelete: Cascade)
  company Company?         @relation(fields: [companyId], references: [id])

}

model IntakeGap {
  id                String      @id @default(cuid())
  intakeId          String
  category          GapCategory
  severity          GapSeverity
  title             String
  description       String      @db.Text
  gdprArticles      Json?

  remedyType        RemedyType?
  remedyPayload     Json?
  policyType        PolicyType?

  status            GapStatus   @default(OPEN)
  createdEntityType String?
  createdEntityId   String?
  dismissReason     String?     @db.Text

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  intake ComplianceIntake @relation(fields: [intakeId], references: [id], onDelete: Cascade)
}
```

Οι δείκτες σε στήλες ξένου κλειδιού παραλείπονται σκόπιμα: η InnoDB δημιουργεί ήδη έναν μαζί με κάθε περιορισμό `FOREIGN KEY`, οπότε ένας ρητός `@@index` θα ήταν δεύτερος δείκτης για την ίδια δουλειά.

- [ ] **Step 3: Πρόσθεσε τα back-relations στα υπάρχοντα μοντέλα**

Στο `model User` (μετά το τελευταίο πεδίο relation, π.χ. `dpaContracts DpaContract[]`):

```prisma
  complianceIntakes ComplianceIntake[]
```

Στο `model Company` (δίπλα στο `dpaContracts DpaContract[]`):

```prisma
  intakeParties IntakeParty[]
```

Στο `model Project` (δίπλα στο `assessments Assessment[]`):

```prisma
  complianceIntakes ComplianceIntake[]
```

- [ ] **Step 4: Εφάρμοσε στη βάση**

Το ιστορικό migrations αυτού του project δεν είναι συγχρονισμένο με την απομακρυσμένη βάση. Το `migrate dev` θα προσπαθούσε να την επαναφέρει και **θα έσβηνε δεδομένα**.

Run:
```bash
npx prisma db push && npx prisma generate
```

Expected: `Your database is now in sync with your Prisma schema.` και `Generated Prisma Client`.

- [ ] **Step 5: Επιβεβαίωσε ότι οι πίνακες υπάρχουν και ο Prisma Client τους ξέρει**

Run:
```bash
npx tsx -e "import {PrismaClient} from '@prisma/client'; const p=new PrismaClient(); p.complianceIntake.count().then(n=>{console.log('intakes:',n); return p.\$disconnect()})"
```

Expected: `intakes: 0`

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(intake): schema for compliance intake pipeline"
```

---

## Task 2: Επικύρωση και κανονικοποίηση ΑΦΜ

Το ΑΦΜ είναι το κύριο κλειδί αντιστοίχισης. Το OCR το επιστρέφει με κενά, παύλες, πρόθεμα `EL`, ή με λατινικά ψηφία που μοιάζουν με ελληνικά. Το check digit πιάνει τα σφάλματα OCR **πριν** αντιστοιχίσουμε λάθος εταιρία.

**Files:**
- Create: `src/lib/intake/vat.ts`
- Test: `src/lib/intake/vat.test.ts`

- [ ] **Step 1: Γράψε το failing test**

```ts
// src/lib/intake/vat.test.ts
import { describe, it, expect } from "vitest";
import { normalizeVat, isValidGreekVat } from "./vat";

describe("normalizeVat", () => {
  it("κρατά ένα καθαρό 9ψήφιο ΑΦΜ", () => {
    expect(normalizeVat("997939640")).toBe("997939640");
  });

  it.each([
    ["κενά", " 997 939 640 "],
    ["παύλες", "997-939-640"],
    ["τελείες", "997.939.640"],
    ["πρόθεμα EL", "EL997939640"],
    ["πρόθεμα el με κενό", "el 997939640"],
    ["πρόθεμα GR", "GR997939640"],
    ["ετικέτα ΑΦΜ", "ΑΦΜ: 997939640"],
  ])("καθαρίζει %s", (_label, input) => {
    expect(normalizeVat(input)).toBe("997939640");
  });

  it("συμπληρώνει μπροστινό μηδέν σε 8ψήφιο παλιό ΑΦΜ", () => {
    expect(normalizeVat("94014201")).toBe("094014201");
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["κενό", ""],
    ["μόνο γράμματα", "ΑΦΜ"],
    ["7 ψηφία", "1234567"],
    ["10 ψηφία", "1234567890"],
  ])("επιστρέφει null για %s", (_label, input) => {
    expect(normalizeVat(input as string)).toBeNull();
  });
});

describe("isValidGreekVat", () => {
  it.each(["997939640", "094014201"])("δέχεται έγκυρο ΑΦΜ %s", (vat) => {
    expect(isValidGreekVat(vat)).toBe(true);
  });

  it("απορρίπτει ΑΦΜ με λάθος ψηφίο ελέγχου", () => {
    expect(isValidGreekVat("997939641")).toBe(false);
  });

  it("απορρίπτει σκέτα μηδενικά", () => {
    expect(isValidGreekVat("000000000")).toBe(false);
  });

  it("απορρίπτει μη κανονικοποιημένη είσοδο", () => {
    expect(isValidGreekVat("997-939-640")).toBe(false);
  });

  it.each([null, undefined, "", "12345678"])("απορρίπτει %p", (input) => {
    expect(isValidGreekVat(input as string)).toBe(false);
  });
});
```

- [ ] **Step 2: Τρέξε το test για να δεις ότι αποτυγχάνει**

Run: `npx vitest run src/lib/intake/vat.test.ts`
Expected: FAIL — `Failed to resolve import "./vat"`

- [ ] **Step 3: Γράψε την υλοποίηση**

```ts
// src/lib/intake/vat.ts

/**
 * Κανονικοποίηση και επικύρωση ελληνικού ΑΦΜ.
 *
 * Το ΑΦΜ είναι το κύριο κλειδί με το οποίο αντιστοιχίζουμε τα μέρη μιας
 * σύμβασης σε εγγραφές `Company`. Το OCR το επιστρέφει «βρόμικο», οπότε
 * καθαρίζεται πρώτα· το ψηφίο ελέγχου πιάνει σφάλματα ανάγνωσης πριν
 * αντιστοιχίσουμε λάθος εταιρία.
 */

/** Ψηφία που το OCR συχνά διαβάζει ως ελληνικά/λατινικά γράμματα. */
const LOOKALIKES: Record<string, string> = {
  O: "0", Ο: "0", о: "0",
  I: "1", Ι: "1", l: "1", "|": "1",
  S: "5", Ѕ: "5",
  B: "8",
};

/**
 * Καθαρίζει ένα ΑΦΜ σε 9 ψηφία, ή `null` αν δεν προκύπτει έγκυρο σχήμα.
 * Τα 8ψήφια (προ-1999) συμπληρώνονται με μπροστινό μηδέν.
 */
export function normalizeVat(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // Η ΣΕΙΡΑ ΕΧΕΙ ΣΗΜΑΣΙΑ: το πρόθεμα χώρας φεύγει ΠΡΙΝ την αντικατάσταση
  // ομόγραφων. Αλλιώς το πεζό «l» του «el» γίνεται «1» και το ΑΦΜ βγαίνει
  // 10ψήφιο, άρα απορρίπτεται.
  const stripped = raw.trim().replace(/^(EL|GR)\s*/i, "");
  const digits = [...stripped]
    .map((ch) => LOOKALIKES[ch] ?? ch)
    .join("")
    .replace(/\D/g, "");

  if (digits.length === 8) return `0${digits}`;
  if (digits.length === 9) return digits;
  return null;
}

/**
 * Ψηφίο ελέγχου ελληνικού ΑΦΜ: τα πρώτα 8 ψηφία σταθμίζονται με 2^8…2^1,
 * το άθροισμα mod 11 mod 10 πρέπει να ισούται με το 9ο ψηφίο.
 *
 * Δέχεται ΜΟΝΟ ήδη κανονικοποιημένη είσοδο — κάλεσε πρώτα `normalizeVat`.
 */
export function isValidGreekVat(vat: string | null | undefined): boolean {
  if (!vat || !/^\d{9}$/.test(vat)) return false;
  if (vat === "000000000") return false;

  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += Number(vat[i]) * 2 ** (8 - i);
  }
  return (sum % 11) % 10 === Number(vat[8]);
}
```

- [ ] **Step 4: Τρέξε το test**

Run: `npx vitest run src/lib/intake/vat.test.ts`
Expected: PASS — 20 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/intake/vat.ts src/lib/intake/vat.test.ts
git commit -m "feat(intake): Greek VAT normalisation with check digit"
```

---

## Task 3: Αντιστοίχιση εταιριών και εντοπισμός ομίλου

Δύο ξεχωριστές δουλειές σε ένα αρχείο επειδή αλλάζουν μαζί: ποια `Company` είναι αυτό το μέρος, και είναι δικό μας ή τρίτος.

Η παγίδα εδώ είναι τα **ελληνικά/λατινικά ομόγραφα**: το «ΚΟΣΜΟΚΑΡ» με ελληνικό Κ και το «KOΣMOKAP» με λατινικά K, O, M, P φαίνονται ίδια αλλά δεν είναι. Το OCR τα ανακατεύει συνεχώς.

**Files:**
- Create: `src/lib/intake/company-match.ts`
- Test: `src/lib/intake/company-match.test.ts`

- [ ] **Step 1: Γράψε το failing test**

```ts
// src/lib/intake/company-match.test.ts
import { describe, it, expect } from "vitest";
import { normalizeCompanyName, matchParty, type MatchCandidate } from "./company-match";

const MOTHER: MatchCandidate = {
  id: "org",
  name: "DGSOFT",
  legalName: "DGSOFT ΕΕ",
  vatNumber: "997939640",
  side: "OWN_MOTHER",
};
const SUBSIDIARY: MatchCandidate = {
  id: "sub1",
  name: "DG Smart",
  legalName: "DG SMART ΙΚΕ",
  vatNumber: "094014201",
  side: "OWN_GROUP",
};
const CLIENT: MatchCandidate = {
  id: "c1",
  name: "ΚΟΣΜΟΚΑΡ",
  legalName: "ΚΟΣΜΟΚΑΡ ΑΝΩΝΥΜΟΣ ΕΤΑΙΡΕΙΑ",
  vatNumber: "094059163",
  side: "EXTERNAL",
};
const ALL = [MOTHER, SUBSIDIARY, CLIENT];

describe("normalizeCompanyName", () => {
  // Η κανονικοποιημένη μορφή είναι ΚΛΕΙΔΙ ΣΥΓΚΡΙΣΗΣ, όχι κείμενο προς εμφάνιση.
  // Γι' αυτό οι περισσότερες δοκιμές ελέγχουν ΙΣΟΤΗΤΕΣ ανάμεσα σε γραφές του
  // ίδιου ονόματος — αυτό είναι το πραγματικό συμβόλαιο. Το να καρφώσουμε την
  // ακριβή εσωτερική μορφή θα έδενε τις δοκιμές σε λεπτομέρεια υλοποίησης.

  it("ονόματα με λατινικούς χαρακτήρες μένουν αναγνώσιμα", () => {
    expect(normalizeCompanyName("DGSOFT")).toBe("dgsoft");
    expect(normalizeCompanyName("  DG   SMART,  ")).toBe("dg smart");
  });

  it("αγνοεί πεζά/κεφαλαία και τόνους", () => {
    expect(normalizeCompanyName("Κοσμοκάρ")).toBe(normalizeCompanyName("ΚΟΣΜΟΚΑΡ"));
  });

  it.each([
    ["ΚΟΣΜΟΚΑΡ Α.Ε.", "ΚΟΣΜΟΚΑΡ"],
    ["DGSOFT Ε.Ε.", "DGSOFT"],
    ["DG SMART Ι.Κ.Ε.", "DG SMART"],
    ["Παπαδόπουλος Ο.Ε.", "Παπαδόπουλος"],
    ["ΑΛΦΑ ΕΠΕ", "ΑΛΦΑ"],
    ["ΒΗΤΑ ΜΟΝΟΠΡΟΣΩΠΗ ΙΚΕ", "ΒΗΤΑ"],
    ["Gamma Ltd", "Gamma"],
  ])("αφαιρεί τη νομική μορφή: %s ≡ %s", (withForm, without) => {
    expect(normalizeCompanyName(withForm)).toBe(normalizeCompanyName(without));
  });

  it("αφαιρεί την ολογράφως νομική μορφή", () => {
    expect(normalizeCompanyName("ΚΟΣΜΟΚΑΡ ΑΝΩΝΥΜΟΣ ΕΤΑΙΡΕΙΑ"))
      .toBe(normalizeCompanyName("ΚΟΣΜΟΚΑΡ"));
  });

  it("ενοποιεί ελληνικά και λατινικά ομόγραφα", () => {
    // «KOΣMOKAP» με λατινικά K, O, M, A, P — τυπικό σφάλμα OCR
    expect(normalizeCompanyName("KOΣMOKAP")).toBe(normalizeCompanyName("ΚΟΣΜΟΚΑΡ"));
  });

  it("ΔΕΝ αφαιρεί νομική μορφή που είναι μέρος λέξης", () => {
    // «ΑΕΡΟΠΟΡΙΑ» ξεκινά με «ΑΕ» αλλά δεν είναι ανώνυμη εταιρεία
    expect(normalizeCompanyName("ΑΕΡΟΠΟΡΙΑ")).not.toBe(normalizeCompanyName("ΡΟΠΟΡΙΑ"));
    expect(normalizeCompanyName("ΑΕΡΟΠΟΡΙΑ").length).toBeGreaterThan(5);
  });

  it("ξεχωρίζει διαφορετικές εταιρίες", () => {
    expect(normalizeCompanyName("ΚΟΣΜΟΚΑΡ")).not.toBe(normalizeCompanyName("ΑΛΦΑ"));
  });

  it("επιστρέφει κενό για άκυρη είσοδο", () => {
    expect(normalizeCompanyName(null)).toBe("");
    expect(normalizeCompanyName(undefined)).toBe("");
    expect(normalizeCompanyName("   ")).toBe("");
    expect(normalizeCompanyName("Α.Ε.")).toBe("");
  });
});

describe("matchParty", () => {
  it("ταιριάζει με ΑΦΜ και επιστρέφει score 1", () => {
    const m = matchParty({ name: "οτιδήποτε", vat: "997939640" }, ALL);
    expect(m).toMatchObject({ candidateId: "org", method: "VAT", score: 1, side: "OWN_MOTHER" });
  });

  it("το ΑΦΜ υπερισχύει του ονόματος όταν διαφωνούν", () => {
    const m = matchParty({ name: "ΚΟΣΜΟΚΑΡ", vat: "997939640" }, ALL);
    expect(m?.candidateId).toBe("org");
  });

  it("καθαρίζει το ΑΦΜ πριν συγκρίνει", () => {
    const m = matchParty({ name: "-", vat: "EL 997-939-640" }, ALL);
    expect(m?.candidateId).toBe("org");
  });

  it("ταιριάζει με όνομα όταν λείπει ΑΦΜ", () => {
    const m = matchParty({ name: "ΚΟΣΜΟΚΑΡ Α.Ε.", vat: null }, ALL);
    expect(m).toMatchObject({ candidateId: "c1", method: "NAME", side: "EXTERNAL" });
  });

  it("ταιριάζει με τη νομική επωνυμία", () => {
    const m = matchParty({ name: "ΚΟΣΜΟΚΑΡ ΑΝΩΝΥΜΟΣ ΕΤΑΙΡΕΙΑ", vat: null }, ALL);
    expect(m?.candidateId).toBe("c1");
  });

  it("εντοπίζει θυγατρική του ομίλου", () => {
    const m = matchParty({ name: "DG SMART ΙΚΕ", vat: null }, ALL);
    expect(m).toMatchObject({ candidateId: "sub1", side: "OWN_GROUP" });
  });

  it("επιστρέφει null όταν δεν ταιριάζει τίποτα", () => {
    expect(matchParty({ name: "ΑΓΝΩΣΤΗ ΕΤΑΙΡΙΑ", vat: null }, ALL)).toBeNull();
  });

  it("επιστρέφει null για ΑΦΜ που δεν υπάρχει και όνομα άγνωστο", () => {
    expect(matchParty({ name: "Άλλο", vat: "123456789" }, ALL)).toBeNull();
  });

  it("ΔΕΝ ταιριάζει με ΑΦΜ που κόβεται στο ψηφίο ελέγχου", () => {
    // Ίδια ψηφία και στις δύο πλευρές, αλλά άκυρο ΑΦΜ: αν το δεχόμασταν, ένα
    // σφάλμα OCR θα έδενε τη σύμβαση σε λάθος εταιρία.
    const bad: MatchCandidate = {
      id: "bad", name: "Χ", legalName: null, vatNumber: "997939641", side: "EXTERNAL",
    };
    expect(matchParty({ name: "άσχετο όνομα", vat: "997939641" }, [bad])).toBeNull();
  });

  it("πέφτει πίσω στο όνομα όταν το ΑΦΜ είναι άκυρο", () => {
    const c: MatchCandidate = {
      id: "c9", name: "ΚΟΣΜΟΚΑΡ", legalName: null, vatNumber: "997939641", side: "EXTERNAL",
    };
    const m = matchParty({ name: "ΚΟΣΜΟΚΑΡ Α.Ε.", vat: "997939641" }, [c]);
    expect(m).toMatchObject({ candidateId: "c9", method: "NAME" });
  });

  it("δεν ταιριάζει σε κενή λίστα υποψηφίων", () => {
    expect(matchParty({ name: "DGSOFT", vat: "997939640" }, [])).toBeNull();
  });

  it("ΔΕΝ μαντεύει όταν δύο εταιρίες έχουν το ίδιο κανονικοποιημένο όνομα", () => {
    const alfa1: MatchCandidate = {
      id: "a1", name: "ΑΛΦΑ", legalName: "ΑΛΦΑ Α.Ε.", vatNumber: "094014201", side: "EXTERNAL",
    };
    const alfa2: MatchCandidate = {
      id: "a2", name: "ΑΛΦΑ ΕΠΕ", legalName: null, vatNumber: "094059163", side: "EXTERNAL",
    };
    // Και οι δύο σειρές — αυτό ακριβώς είναι το ζητούμενο.
    expect(matchParty({ name: "ΑΛΦΑ", vat: null }, [alfa1, alfa2])).toBeNull();
    expect(matchParty({ name: "ΑΛΦΑ", vat: null }, [alfa2, alfa1])).toBeNull();
  });

  it("ασάφεια ΑΦΜ: προτιμά τη δική μας εταιρία, ανεξάρτητα από τη σειρά", () => {
    const asOrg: MatchCandidate = {
      id: "org", name: "DGSOFT", legalName: null, vatNumber: "997939640", side: "OWN_MOTHER",
    };
    const asCompany: MatchCandidate = {
      id: "dup", name: "DGSOFT", legalName: null, vatNumber: "997939640", side: "EXTERNAL",
    };
    expect(matchParty({ name: "-", vat: "997939640" }, [asCompany, asOrg])?.candidateId).toBe("org");
    expect(matchParty({ name: "-", vat: "997939640" }, [asOrg, asCompany])?.candidateId).toBe("org");
  });

  it("αγνοεί υποψήφιους χωρίς ΑΦΜ κατά την αντιστοίχιση ΑΦΜ", () => {
    const noVat: MatchCandidate = { id: "x", name: "Χ", legalName: null, vatNumber: null, side: "EXTERNAL" };
    expect(matchParty({ name: "άσχετο", vat: "111111111" }, [noVat])).toBeNull();
  });
});
```

- [ ] **Step 2: Τρέξε το test για να δεις ότι αποτυγχάνει**

Run: `npx vitest run src/lib/intake/company-match.test.ts`
Expected: FAIL — `Failed to resolve import "./company-match"`

- [ ] **Step 3: Γράψε την υλοποίηση**

```ts
// src/lib/intake/company-match.ts
import { normalizeVat, isValidGreekVat } from "./vat";

export type PartySideValue = "OWN_MOTHER" | "OWN_GROUP" | "EXTERNAL";
export type MatchMethodValue = "VAT" | "NAME" | "MANUAL" | "NONE";

export interface MatchCandidate {
  /** `Company.id`, ή το σταθερό "org" για τη μαμά εταιρία. */
  id: string;
  name: string;
  legalName: string | null;
  vatNumber: string | null;
  side: PartySideValue;
}

export interface ExtractedParty {
  name: string;
  vat: string | null;
}

export interface PartyMatch {
  candidateId: string;
  method: MatchMethodValue;
  score: number;
  side: PartySideValue;
}

/**
 * Ελληνικοί χαρακτήρες οπτικά ταυτόσημοι με λατινικούς.
 *
 * Η κατεύθυνση είναι ελληνικά → λατινικά, όχι το αντίστροφο: έτσι ένα καθαρά
 * λατινικό όνομα («DGSOFT») μένει αναγνώσιμο στο κλειδί σύγκρισης, ενώ το
 * «ΚΟΣΜΟΚΑΡ» και το OCR-μαγκλαρισμένο «KOΣMOKAP» καταλήγουν στο ίδιο κλειδί.
 */
const GREEK_TO_LATIN: Record<string, string> = {
  Α: "A", Β: "B", Ε: "E", Ζ: "Z", Η: "H", Ι: "I", Κ: "K",
  Μ: "M", Ν: "N", Ο: "O", Ρ: "P", Τ: "T", Χ: "X", Υ: "Y",
  α: "a", β: "b", ε: "e", ζ: "z", η: "h", ι: "i", κ: "k",
  μ: "m", ν: "n", ο: "o", ρ: "p", τ: "t", χ: "x", υ: "y",
};

function foldLookalikes(s: string): string {
  return [...s].map((ch) => GREEK_TO_LATIN[ch] ?? ch).join("");
}

/**
 * Νομικές μορφές, συντομογραφίες και ολογράφως — περασμένες από την ΙΔΙΑ
 * αναδίπλωση ώστε να ταιριάζουν με το κανονικοποιημένο κείμενο.
 */
const LEGAL_FORMS = [
  "ανωνυμος εταιρεια", "ανωνυμη εταιρεια", "ανωνυμος εταιρια",
  "ετερορρυθμη εταιρεια", "ομορρυθμη εταιρεια",
  "ιδιωτικη κεφαλαιουχικη εταιρεια",
  "εταιρεια περιορισμενης ευθυνης",
  "μονοπροσωπη", "μον",
  "αε", "εε", "οε", "επε", "ικε", "ιμε",
  "sa", "ltd", "llc", "gmbh", "plc", "inc", "bv", "ab", "oy",
].map(foldLookalikes);

/**
 * Κανονικοποιεί επωνυμία σε κλειδί σύγκρισης: πεζά, χωρίς τόνους, χωρίς
 * νομική μορφή, χωρίς στίξη, με ενιαία κενά.
 *
 * Οι τελείες ΑΦΑΙΡΟΥΝΤΑΙ αντί να γίνουν κενά, αλλιώς το «Α.Ε.» θα κατέληγε
 * «α ε» και δεν θα αναγνωριζόταν ως νομική μορφή.
 */
export function normalizeCompanyName(raw: string | null | undefined): string {
  if (!raw) return "";

  let s = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // τόνοι και διαλυτικά
    .toLowerCase();

  s = foldLookalikes(s);

  s = s
    .replace(/\./g, "")
    .replace(/[,·''""()\-_/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Η νομική μορφή αφαιρείται μόνο ως ΞΕΧΩΡΙΣΤΗ λέξη, ώστε το «ΑΕΡΟΠΟΡΙΑ»
  // να μη χάσει το «ΑΕ» του.
  for (const form of LEGAL_FORMS) {
    const escaped = form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    s = s
      .replace(new RegExp(`(^|\\s)${escaped}(\\s|$)`, "g"), " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return s;
}

/**
 * Βρίσκει τον υποψήφιο που αντιστοιχεί σε ένα εξαχθέν μέρος.
 * ΑΦΜ πρώτα (score 1), όνομα δεύτερο (score 0.8). `null` αν δεν ταιριάζει.
 */
export function matchParty(
  party: ExtractedParty,
  candidates: MatchCandidate[]
): PartyMatch | null {
  // Το ψηφίο ελέγχου ΠΡΕΠΕΙ να επαληθευτεί πριν δεχθούμε ταίριασμα με ΑΦΜ.
  // Το `normalizeVat` καθαρίζει μορφή, δεν κρίνει αν ο αριθμός είναι ΑΦΜ:
  // μια ημερομηνία ή ένας αριθμός παραστατικού έχουν κι αυτά ψηφία και
  // διαχωριστικά. Ο έλεγχος κόβει περίπου το 90% των τυχαίων ψηφίων. Δεν
  // είναι τέλειος — περίπου 1 στα 10 περνά τυχαία — γι' αυτό η τελική άμυνα
  // παραμένει η ανθρώπινη επιβεβαίωση στο βήμα 4 του wizard.
  const vat = normalizeVat(party.vat);
  if (vat && isValidGreekVat(vat)) {
    const hits = candidates.filter((c) => normalizeVat(c.vatNumber) === vat);
    // Το Company.vatNumber είναι @unique, οπότε σύγκρουση σημαίνει ότι η μαμά
    // υπάρχει και ως εγγραφή Company. Προτιμάμε τη δική μας πλευρά: το «αυτοί
    // είμαστε εμείς» είναι η πιο βαριά πληροφορία και δεν πρέπει να εξαρτάται
    // από τη σειρά του πίνακα.
    const hit = hits.find((c) => c.side !== "EXTERNAL") ?? hits[0];
    if (hit) return { candidateId: hit.id, method: "VAT", score: 1, side: hit.side };
  }

  const name = normalizeCompanyName(party.name);
  if (name) {
    const hits = candidates.filter(
      (c) =>
        normalizeCompanyName(c.name) === name ||
        normalizeCompanyName(c.legalName) === name
    );

    // Ένα ταίριασμα: το δεχόμαστε. Περισσότερα: ΔΕΝ μαντεύουμε. Δύο εταιρίες
    // μπορούν κάλλιστα να λέγονται «ΑΛΦΑ» με διαφορετικό ΑΦΜ, και η επιλογή
    // «όποια βρέθηκε πρώτη» εξαρτάται από τη σειρά του πίνακα. Το μέρος
    // επιστρέφεται ως αταίριαστο και το λύνει ο άνθρωπος στο βήμα 4 — μια
    // λανθασμένη αντιστοίχιση φαίνεται σωστή και δεν ξανακοιτάζεται ποτέ.
    if (hits.length === 1) {
      return { candidateId: hits[0].id, method: "NAME", score: 0.8, side: hits[0].side };
    }
  }

  return null;
}
```

- [ ] **Step 4: Τρέξε το test**

Run: `npx vitest run src/lib/intake/company-match.test.ts`
Expected: PASS — 17 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/intake/company-match.ts src/lib/intake/company-match.test.ts
git commit -m "feat(intake): company matching by VAT then name"
```

---

## Task 4: Πύλη ποιότητας OCR

Αποφασίζει αν μια σελίδα διαβάστηκε αρκετά καλά ή θέλει κλιμάκωση στο ακριβότερο μοντέλο. Καθαρή αριθμητική — κανένα AI.

**Files:**
- Create: `src/lib/intake/quality-gate.ts`
- Test: `src/lib/intake/quality-gate.test.ts`

- [ ] **Step 1: Γράψε το failing test**

```ts
// src/lib/intake/quality-gate.test.ts
import { describe, it, expect } from "vitest";
import { scoreOcrText, needsEscalation, DEFAULT_QUALITY_THRESHOLD } from "./quality-gate";

const GOOD = `
ΣΥΜΒΑΣΗ ΠΑΡΟΧΗΣ ΥΠΗΡΕΣΙΩΝ

Στην Αθήνα σήμερα 12 Μαρτίου 2026, ΜΕΤΑΞΥ αφενός της εταιρείας DGSOFT ΕΕ,
με ΑΦΜ 997939640, ΔΟΥ ΚΕΦΟΔΕ ΑΤΤΙΚΗΣ, και αφετέρου της ΚΟΣΜΟΚΑΡ Α.Ε.,
με ΑΦΜ 094059163, συμφωνήθηκαν τα ακόλουθα όσον αφορά την επεξεργασία
δεδομένων προσωπικού χαρακτήρα σύμφωνα με τον Κανονισμό 2016/679.
`;

describe("scoreOcrText", () => {
  it("δίνει υψηλό score σε καθαρό ελληνικό συμβατικό κείμενο", () => {
    expect(scoreOcrText(GOOD, 1)).toBeGreaterThanOrEqual(0.9);
  });

  it("δίνει 0 σε κενό κείμενο", () => {
    expect(scoreOcrText("", 1)).toBe(0);
    expect(scoreOcrText("   \n  ", 1)).toBe(0);
  });

  it("τιμωρεί κείμενο γεμάτο replacement characters", () => {
    const garbled = "�".repeat(200) + GOOD;
    expect(scoreOcrText(garbled, 1)).toBeLessThan(DEFAULT_QUALITY_THRESHOLD);
  });

  it("τιμωρεί λατινικό κείμενο εκεί που περιμέναμε ελληνικό", () => {
    const latin = "AGREEMENT FOR SERVICES ".repeat(30);
    expect(scoreOcrText(latin, 1)).toBeLessThan(DEFAULT_QUALITY_THRESHOLD);
  });

  it("τιμωρεί υπερβολικά λίγο κείμενο για τον αριθμό σελίδων", () => {
    expect(scoreOcrText(GOOD, 20)).toBeLessThan(DEFAULT_QUALITY_THRESHOLD);
  });

  it("ανταμείβει την παρουσία συμβατικών όρων", () => {
    const withTerms = GOOD;
    const withoutTerms = GOOD
      .replace(/ΣΥΜΒΑΣΗ/g, "ΚΕΙΜΕΝΟ")
      .replace(/ΜΕΤΑΞΥ/g, "ανάμεσα")
      .replace(/ΑΦΜ/g, "αριθμός");
    expect(scoreOcrText(withTerms, 1)).toBeGreaterThan(scoreOcrText(withoutTerms, 1));
  });

  it("το score μένει πάντα στο [0,1]", () => {
    for (const [text, pages] of [[GOOD, 1], ["", 1], ["�", 5], [GOOD.repeat(50), 1]] as const) {
      const s = scoreOcrText(text as string, pages as number);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  it("μηδενικές ή άγνωστες σελίδες αντιμετωπίζονται ως μία", () => {
    expect(scoreOcrText(GOOD, 0)).toBe(scoreOcrText(GOOD, 1));
    expect(scoreOcrText(GOOD, null)).toBe(scoreOcrText(GOOD, 1));
  });
});

describe("needsEscalation", () => {
  it("κάτω από το κατώφλι κλιμακώνει", () => {
    expect(needsEscalation(0.5, 0.7)).toBe(true);
  });

  it("ακριβώς στο κατώφλι ΔΕΝ κλιμακώνει", () => {
    expect(needsEscalation(0.7, 0.7)).toBe(false);
  });

  it("πάνω από το κατώφλι δεν κλιμακώνει", () => {
    expect(needsEscalation(0.95, 0.7)).toBe(false);
  });

  it("χρησιμοποιεί το προεπιλεγμένο κατώφλι όταν δεν δοθεί", () => {
    expect(needsEscalation(DEFAULT_QUALITY_THRESHOLD - 0.01)).toBe(true);
    expect(needsEscalation(DEFAULT_QUALITY_THRESHOLD)).toBe(false);
  });
});
```

- [ ] **Step 2: Τρέξε το test για να δεις ότι αποτυγχάνει**

Run: `npx vitest run src/lib/intake/quality-gate.test.ts`
Expected: FAIL — `Failed to resolve import "./quality-gate"`

- [ ] **Step 3: Γράψε την υλοποίηση**

```ts
// src/lib/intake/quality-gate.ts

/**
 * Βαθμολογεί την ποιότητα μιας εξαγωγής OCR χωρίς AI.
 *
 * Σκοπός: να πιάσει τη σελίδα που «διαβάστηκε» αλλά βγήκε σκουπίδι, ώστε να
 * ξαναδιαβαστεί από ισχυρότερο μοντέλο πριν χτίσουμε νομικά συμπεράσματα
 * πάνω σε ασυναρτησίες.
 */

export const DEFAULT_QUALITY_THRESHOLD = 0.7;

/** Λέξεις που σχεδόν σίγουρα υπάρχουν σε ελληνική σύμβαση ή προσφορά. */
const CONTRACT_TERMS = [
  "ΣΥΜΒΑΣΗ", "ΜΕΤΑΞΥ", "ΑΦΜ", "ΔΟΥ", "ΣΥΜΒΑΛΛΟΜΕΝ",
  "ΠΡΟΣΦΟΡΑ", "ΥΠΟΓΡΑΦ", "ΑΡΘΡΟ", "ΕΤΑΙΡ",
];

/** Ελάχιστοι χαρακτήρες ανά σελίδα για να θεωρηθεί ότι διαβάστηκε κάτι. */
const MIN_CHARS_PER_PAGE = 250;

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/**
 * Score 0–1. Τέσσερα σήματα, σταθμισμένα:
 *  - πυκνότητα κειμένου ανά σελίδα (0.30)
 *  - αναλογία ελληνικών προς λατινικά γράμματα (0.30)
 *  - απουσία replacement characters (0.20)
 *  - παρουσία συμβατικών όρων (0.20)
 */
export function scoreOcrText(text: string, pageCount: number | null | undefined): number {
  const body = (text ?? "").trim();
  if (body.length === 0) return 0;

  const pages = Math.max(1, pageCount ?? 1);

  // 1. Πυκνότητα — κορεσμός στο MIN_CHARS_PER_PAGE
  const density = clamp01(body.length / (MIN_CHARS_PER_PAGE * pages));

  // 2. Ελληνικά vs λατινικά. Ένα ελληνικό έγγραφο που βγήκε λατινικό είναι
  //    σχεδόν πάντα λάθος ανάγνωση, όχι αγγλικό κείμενο.
  const greek = (body.match(/[\u0370-\u03FF\u1F00-\u1FFF]/g) ?? []).length;
  const latin = (body.match(/[A-Za-z]/g) ?? []).length;
  const letters = greek + latin;
  const greekRatio = letters === 0 ? 0 : greek / letters;

  // 3. Replacement characters και control junk
  const junk = (body.match(/[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F]/g) ?? []).length;
  const cleanliness = clamp01(1 - (junk / body.length) * 20);

  // 4. Συμβατικοί όροι
  const upper = body.toUpperCase();
  const found = CONTRACT_TERMS.filter((t) => upper.includes(t)).length;
  const termScore = clamp01(found / 4);

  return clamp01(
    density * 0.3 + greekRatio * 0.3 + cleanliness * 0.2 + termScore * 0.2
  );
}

/** Χρειάζεται ξαναδιάβασμα από ισχυρότερο μοντέλο; */
export function needsEscalation(
  score: number,
  threshold: number = DEFAULT_QUALITY_THRESHOLD
): boolean {
  return score < threshold;
}
```

- [ ] **Step 4: Τρέξε το test**

Run: `npx vitest run src/lib/intake/quality-gate.test.ts`
Expected: PASS — 12 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/intake/quality-gate.ts src/lib/intake/quality-gate.test.ts
git commit -m "feat(intake): OCR quality gate with escalation threshold"
```

---

## Task 5: Χαρτογράφηση ρόλων και κανόνας μπλοκαρίσματος

**Files:**
- Create: `src/lib/intake/role-mapping.ts`
- Create: `src/lib/intake/blocking-rule.ts`
- Test: `src/lib/intake/role-mapping.test.ts`
- Test: `src/lib/intake/blocking-rule.test.ts`

- [ ] **Step 1: Γράψε τα failing tests**

```ts
// src/lib/intake/role-mapping.test.ts
import { describe, it, expect } from "vitest";
import { toDpaRole, type PartyRoleValue } from "./role-mapping";

describe("toDpaRole", () => {
  it.each([
    ["CONTROLLER", "PROCESSOR", "COMPANY_AS_PROCESSOR"],
    ["PROCESSOR", "CONTROLLER", "COMPANY_AS_CONTROLLER"],
    ["JOINT_CONTROLLER", "JOINT_CONTROLLER", "JOINT_CONTROLLERS"],
  ] as const)("(%s, %s) → %s", (ours, theirs, expected) => {
    expect(toDpaRole(ours, theirs)).toBe(expected);
  });

  it.each([
    ["CONTROLLER", "CONTROLLER"],
    ["PROCESSOR", "PROCESSOR"],
    ["CONTROLLER", "JOINT_CONTROLLER"],
    ["SUB_PROCESSOR", "CONTROLLER"],
    ["RECIPIENT", "PROCESSOR"],
    ["THIRD_PARTY", "THIRD_PARTY"],
  ] as [PartyRoleValue, PartyRoleValue][])(
    "(%s, %s) είναι άκυρος συνδυασμός → null",
    (ours, theirs) => {
      expect(toDpaRole(ours, theirs)).toBeNull();
    }
  );

  it("επιστρέφει null όταν λείπει ρόλος", () => {
    expect(toDpaRole(null, "PROCESSOR")).toBeNull();
    expect(toDpaRole("CONTROLLER", null)).toBeNull();
    expect(toDpaRole(null, null)).toBeNull();
  });
});
```

```ts
// src/lib/intake/blocking-rule.test.ts
import { describe, it, expect } from "vitest";
import { canCommit, type GapState, type PartyState } from "./blocking-rule";

const ok: PartyState[] = [
  { side: "OWN_MOTHER", confirmedRole: "PROCESSOR" },
  { side: "EXTERNAL", confirmedRole: "CONTROLLER" },
];

const gap = (over: Partial<GapState> = {}): GapState => ({
  severity: "CRITICAL",
  status: "DRAFTED",
  dismissReason: null,
  ...over,
});

describe("canCommit", () => {
  it("επιτρέπει όταν δεν υπάρχουν κενά", () => {
    expect(canCommit(ok, [])).toEqual({ allowed: true, reasons: [] });
  });

  it("επιτρέπει κρίσιμο κενό σε DRAFTED", () => {
    expect(canCommit(ok, [gap({ status: "DRAFTED" })]).allowed).toBe(true);
  });

  it("επιτρέπει κρίσιμο κενό σε RESOLVED", () => {
    expect(canCommit(ok, [gap({ status: "RESOLVED" })]).allowed).toBe(true);
  });

  it("μπλοκάρει κρίσιμο κενό σε OPEN", () => {
    const r = canCommit(ok, [gap({ status: "OPEN" })]);
    expect(r.allowed).toBe(false);
    expect(r.reasons.join()).toMatch(/κρίσιμ/i);
  });

  it("μπλοκάρει DISMISSED χωρίς αιτιολογία", () => {
    expect(canCommit(ok, [gap({ status: "DISMISSED", dismissReason: null })]).allowed).toBe(false);
    expect(canCommit(ok, [gap({ status: "DISMISSED", dismissReason: "  " })]).allowed).toBe(false);
  });

  it("επιτρέπει DISMISSED με αιτιολογία", () => {
    expect(canCommit(ok, [gap({ status: "DISMISSED", dismissReason: "Καλύπτεται από την ISO 27001" })]).allowed).toBe(true);
  });

  it("τα μη κρίσιμα κενά δεν μπλοκάρουν ποτέ", () => {
    for (const severity of ["HIGH", "MEDIUM", "LOW"] as const) {
      expect(canCommit(ok, [gap({ severity, status: "OPEN" })]).allowed).toBe(true);
    }
  });

  it("μπλοκάρει όταν κανένα μέρος δεν είναι δικό μας", () => {
    const r = canCommit([{ side: "EXTERNAL", confirmedRole: "CONTROLLER" }], []);
    expect(r.allowed).toBe(false);
    expect(r.reasons.join()).toMatch(/δική μας/i);
  });

  it("μπλοκάρει όταν υπάρχουν δύο μαμάδες", () => {
    const r = canCommit(
      [
        { side: "OWN_MOTHER", confirmedRole: "PROCESSOR" },
        { side: "OWN_MOTHER", confirmedRole: "CONTROLLER" },
        { side: "EXTERNAL", confirmedRole: "CONTROLLER" },
      ],
      []
    );
    expect(r.allowed).toBe(false);
    expect(r.reasons.join()).toMatch(/μαμά/i);
  });

  it("μπλοκάρει όταν μέρος δεν έχει επιβεβαιωμένο ρόλο", () => {
    const r = canCommit(
      [{ side: "OWN_MOTHER", confirmedRole: null }, { side: "EXTERNAL", confirmedRole: "CONTROLLER" }],
      []
    );
    expect(r.allowed).toBe(false);
    expect(r.reasons.join()).toMatch(/ρόλο/i);
  });

  it("επιτρέπει σύμβαση μόνο με θυγατρική, χωρίς μαμά", () => {
    expect(
      canCommit(
        [{ side: "OWN_GROUP", confirmedRole: "PROCESSOR" }, { side: "EXTERNAL", confirmedRole: "CONTROLLER" }],
        []
      ).allowed
    ).toBe(true);
  });

  it("συγκεντρώνει όλους τους λόγους, δεν σταματά στον πρώτο", () => {
    const r = canCommit([{ side: "EXTERNAL", confirmedRole: null }], [gap({ status: "OPEN" })]);
    expect(r.reasons.length).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Τρέξε τα tests για να δεις ότι αποτυγχάνουν**

Run: `npx vitest run src/lib/intake/role-mapping.test.ts src/lib/intake/blocking-rule.test.ts`
Expected: FAIL — και τα δύο imports δεν βρίσκονται

- [ ] **Step 3: Γράψε το `role-mapping.ts`**

```ts
// src/lib/intake/role-mapping.ts

/**
 * Μεταφράζει το ζεύγος ρόλων σε `DpaRole`, το enum που ήδη χρησιμοποιεί το
 * υπάρχον DPA module. Το `PartyRole` περιγράφει ΕΝΑ μέρος (γιατί οι συμβάσεις
 * έχουν συχνά τρία ή τέσσερα)· το `DpaRole` περιγράφει τη σχέση ενός ζεύγους.
 */

export type PartyRoleValue =
  | "CONTROLLER" | "PROCESSOR" | "JOINT_CONTROLLER"
  | "SUB_PROCESSOR" | "RECIPIENT" | "THIRD_PARTY";

export type DpaRoleValue =
  | "COMPANY_AS_PROCESSOR" | "COMPANY_AS_CONTROLLER" | "JOINT_CONTROLLERS";

/**
 * `null` για κάθε συνδυασμό που δεν αντιστοιχεί σε DPA άρθρου 28 — π.χ. δύο
 * Υπεύθυνοι Επεξεργασίας χωρίς από κοινού καθορισμό σκοπών δεν συνάπτουν DPA.
 * Ο καλών πρέπει να χειριστεί το `null`, όχι να υποθέσει προεπιλογή.
 */
export function toDpaRole(
  ours: PartyRoleValue | null | undefined,
  theirs: PartyRoleValue | null | undefined
): DpaRoleValue | null {
  if (!ours || !theirs) return null;

  if (ours === "CONTROLLER" && theirs === "PROCESSOR") return "COMPANY_AS_PROCESSOR";
  if (ours === "PROCESSOR" && theirs === "CONTROLLER") return "COMPANY_AS_CONTROLLER";
  if (ours === "JOINT_CONTROLLER" && theirs === "JOINT_CONTROLLER") return "JOINT_CONTROLLERS";

  return null;
}
```

- [ ] **Step 4: Γράψε το `blocking-rule.ts`**

```ts
// src/lib/intake/blocking-rule.ts
import type { PartyRoleValue } from "./role-mapping";
import type { PartySideValue } from "./company-match";

export type GapSeverityValue = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type GapStatusValue = "OPEN" | "DRAFTED" | "RESOLVED" | "DISMISSED";

export interface GapState {
  severity: GapSeverityValue;
  status: GapStatusValue;
  dismissReason: string | null;
}

export interface PartyState {
  side: PartySideValue;
  confirmedRole: PartyRoleValue | null;
}

export interface CommitVerdict {
  allowed: boolean;
  /** Όλοι οι λόγοι, όχι μόνο ο πρώτος — ο χρήστης πρέπει να τους δει μαζί. */
  reasons: string[];
}

/**
 * Πότε επιτρέπεται να κλείσει το intake και να δημιουργηθεί `Project`.
 *
 * Τα κρίσιμα κενά πρέπει να είναι τουλάχιστον σε πρόχειρο ή να έχουν
 * απορριφθεί με γραπτή αιτιολογία: σε έλεγχο, το «το αγνοήσαμε» χρειάζεται
 * υπογραφή. Η πλήρης επίλυσή τους απαιτείται αργότερα, στο κλείσιμο του έργου.
 */
export function canCommit(parties: PartyState[], gaps: GapState[]): CommitVerdict {
  const reasons: string[] = [];

  const ours = parties.filter((p) => p.side !== "EXTERNAL");
  if (ours.length === 0) {
    reasons.push("Καμία δική μας εταιρία δεν εντοπίστηκε στη σύμβαση.");
  }

  if (parties.filter((p) => p.side === "OWN_MOTHER").length > 1) {
    reasons.push("Περισσότερα από ένα μέρη σημειώθηκαν ως η μαμά εταιρία.");
  }

  if (parties.some((p) => !p.confirmedRole)) {
    reasons.push("Κάθε μέρος πρέπει να έχει επιβεβαιωμένο ρόλο.");
  }

  for (const gap of gaps) {
    if (gap.severity !== "CRITICAL") continue;
    if (gap.status === "OPEN") {
      reasons.push("Υπάρχει κρίσιμο κενό συμμόρφωσης που δεν έχει αντιμετωπιστεί.");
    }
    if (gap.status === "DISMISSED" && !gap.dismissReason?.trim()) {
      reasons.push("Η απόρριψη κρίσιμου κενού απαιτεί γραπτή αιτιολογία.");
    }
  }

  return { allowed: reasons.length === 0, reasons };
}
```

- [ ] **Step 5: Τρέξε τα tests**

Run: `npx vitest run src/lib/intake/role-mapping.test.ts src/lib/intake/blocking-rule.test.ts`
Expected: PASS — 22 tests συνολικά

- [ ] **Step 6: Commit**

```bash
git add src/lib/intake/role-mapping.ts src/lib/intake/role-mapping.test.ts \
        src/lib/intake/blocking-rule.ts src/lib/intake/blocking-rule.test.ts
git commit -m "feat(intake): role mapping and commit blocking rule"
```

---

## Task 6: Zod schemas για τις εξόδους των AI

Το όριο ανάμεσα στο «τι είπε το μοντέλο» και «τι μπαίνει στη βάση». Ό,τι δεν περνά από εδώ δεν αποθηκεύεται.

**Files:**
- Create: `src/lib/intake/schemas.ts`
- Test: `src/lib/intake/schemas.test.ts`

- [ ] **Step 1: Γράψε το failing test**

```ts
// src/lib/intake/schemas.test.ts
import { describe, it, expect } from "vitest";
import { ExtractionSchema, ReasoningSchema, parseAiJson } from "./schemas";

const validExtraction = {
  parties: [
    {
      name: "DGSOFT ΕΕ",
      vat: "997939640",
      address: "ΛΕΩΦ ΚΗΦΙΣΟΥ 48, ΠΕΡΙΣΤΕΡΙ",
      representative: "Γ. Κοζύρης",
      email: "info@dgsoft.gr",
    },
    { name: "ΚΟΣΜΟΚΑΡ Α.Ε.", vat: "094059163" },
  ],
  subject: "Παροχή υπηρεσιών ανάπτυξης λογισμικού",
  signedAt: "2026-03-12",
  term: "12 μήνες",
  dataCategories: ["Στοιχεία πελατών", "Στοιχεία παραγγελιών"],
  subProcessors: ["Bunny CDN"],
  crossBorderTransfer: false,
  specialCategories: false,
  signatories: ["Γ. Κοζύρης"],
};

describe("ExtractionSchema", () => {
  it("δέχεται πλήρη έγκυρη απάντηση", () => {
    expect(ExtractionSchema.parse(validExtraction).parties).toHaveLength(2);
  });

  it("συμπληρώνει προεπιλογές για τα προαιρετικά", () => {
    const minimal = ExtractionSchema.parse({ parties: [{ name: "Α" }] });
    expect(minimal.dataCategories).toEqual([]);
    expect(minimal.subProcessors).toEqual([]);
    expect(minimal.crossBorderTransfer).toBe(false);
    expect(minimal.parties[0].vat).toBeNull();
  });

  it("απορρίπτει απάντηση χωρίς μέρη", () => {
    expect(() => ExtractionSchema.parse({ parties: [] })).toThrow();
    expect(() => ExtractionSchema.parse({})).toThrow();
  });

  it("απορρίπτει μέρος χωρίς όνομα", () => {
    expect(() => ExtractionSchema.parse({ parties: [{ vat: "997939640" }] })).toThrow();
    expect(() => ExtractionSchema.parse({ parties: [{ name: "  " }] })).toThrow();
  });

  it("αγνοεί άγνωστα πεδία αντί να σκάει", () => {
    const parsed = ExtractionSchema.parse({ ...validExtraction, hallucinatedField: "χχχ" });
    expect(parsed).not.toHaveProperty("hallucinatedField");
  });

  it("απορρίπτει λάθος τύπο", () => {
    expect(() => ExtractionSchema.parse({ parties: "DGSOFT" })).toThrow();
    expect(() => ExtractionSchema.parse({ ...validExtraction, crossBorderTransfer: "ναι" })).toThrow();
  });
});

describe("ReasoningSchema", () => {
  const valid = {
    partyRoles: [
      { name: "DGSOFT ΕΕ", role: "PROCESSOR", rationale: "Επεξεργάζεται κατ' εντολή.", gdprArticles: ["28"] },
      { name: "ΚΟΣΜΟΚΑΡ Α.Ε.", role: "CONTROLLER", rationale: "Καθορίζει σκοπούς.", gdprArticles: ["4(7)", "24"] },
    ],
    gaps: [
      {
        category: "CONTRACT",
        severity: "CRITICAL",
        title: "Λείπει DPA",
        description: "Δεν υπάρχει σύμβαση επεξεργασίας άρθρου 28.",
        remedyType: "CREATE_DPA",
        gdprArticles: ["28"],
      },
    ],
  };

  it("δέχεται έγκυρη απάντηση", () => {
    expect(ReasoningSchema.parse(valid).gaps).toHaveLength(1);
  });

  it("επιτρέπει κενή λίστα κενών", () => {
    expect(ReasoningSchema.parse({ ...valid, gaps: [] }).gaps).toEqual([]);
  });

  it("απορρίπτει άγνωστο ρόλο", () => {
    const bad = { ...valid, partyRoles: [{ ...valid.partyRoles[0], role: "ΕΠΕΞΕΡΓΑΣΤΗΣ" }] };
    expect(() => ReasoningSchema.parse(bad)).toThrow();
  });

  it("απορρίπτει άγνωστη σοβαρότητα ή κατηγορία", () => {
    expect(() => ReasoningSchema.parse({ ...valid, gaps: [{ ...valid.gaps[0], severity: "ΠΟΛΥ_ΚΡΙΣΙΜΟ" }] })).toThrow();
    expect(() => ReasoningSchema.parse({ ...valid, gaps: [{ ...valid.gaps[0], category: "ΑΛΛΟ" }] })).toThrow();
  });

  it("το remedyType επιτρέπεται να λείπει", () => {
    const { remedyType: _omit, ...noRemedy } = valid.gaps[0];
    expect(ReasoningSchema.parse({ ...valid, gaps: [noRemedy] }).gaps[0].remedyType).toBeNull();
  });
});

describe("parseAiJson", () => {
  it("διαβάζει σκέτο JSON", () => {
    expect(parseAiJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("ξετυλίγει code fence", () => {
    expect(parseAiJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseAiJson('```\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("αγνοεί φλυαρία γύρω από το JSON", () => {
    expect(parseAiJson('Ορίστε το αποτέλεσμα:\n{"a":1}\nΕλπίζω να βοηθά.')).toEqual({ a: 1 });
  });

  it("διαβάζει πίνακα στο ανώτατο επίπεδο", () => {
    expect(parseAiJson("[1,2]")).toEqual([1, 2]);
  });

  it("πετά σε κείμενο χωρίς JSON", () => {
    expect(() => parseAiJson("δεν βρήκα τίποτα")).toThrow(/JSON/i);
    expect(() => parseAiJson("")).toThrow(/JSON/i);
  });
});
```

- [ ] **Step 2: Τρέξε το test για να δεις ότι αποτυγχάνει**

Run: `npx vitest run src/lib/intake/schemas.test.ts`
Expected: FAIL — `Failed to resolve import "./schemas"`

- [ ] **Step 3: Γράψε την υλοποίηση**

```ts
// src/lib/intake/schemas.ts
import { z } from "zod";

/**
 * Το όριο ανάμεσα στο «τι είπε το μοντέλο» και «τι μπαίνει στη βάση».
 *
 * Τα schemas είναι επίτηδες ανεκτικά στα προαιρετικά πεδία (ένα μοντέλο θα
 * παραλείψει κάτι) και αυστηρά στα enums (ένας εφευρημένος ρόλος θα γινόταν
 * λάθος `DpaContract`).
 */

const nonEmpty = z.string().trim().min(1);
const optionalText = z.string().trim().nullish().transform((v) => v || null);

export const PartyRoleEnum = z.enum([
  "CONTROLLER", "PROCESSOR", "JOINT_CONTROLLER",
  "SUB_PROCESSOR", "RECIPIENT", "THIRD_PARTY",
]);

export const GapCategoryEnum = z.enum([
  "POLICY", "DPIA", "ROPA", "TRAINING", "TECHNICAL", "CONTRACT", "DPO",
]);

export const GapSeverityEnum = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);

export const RemedyTypeEnum = z.enum([
  "CREATE_POLICY", "CREATE_DPIA", "CREATE_DPA", "CREATE_JCA",
  "CREATE_ROPA_ENTRY", "CREATE_ASSESSMENT", "ASSIGN_DPO", "CREATE_TRAINING",
]);

export const ExtractedPartySchema = z.object({
  name: nonEmpty,
  vat: optionalText,
  address: optionalText,
  representative: optionalText,
  email: optionalText,
});

export const ExtractionSchema = z.object({
  parties: z.array(ExtractedPartySchema).min(1),
  subject: optionalText,
  signedAt: optionalText,
  term: optionalText,
  dataCategories: z.array(z.string()).default([]),
  subProcessors: z.array(z.string()).default([]),
  crossBorderTransfer: z.boolean().default(false),
  specialCategories: z.boolean().default(false),
  signatories: z.array(z.string()).default([]),
});

export const ReasoningSchema = z.object({
  partyRoles: z
    .array(
      z.object({
        name: nonEmpty,
        role: PartyRoleEnum,
        rationale: optionalText,
        gdprArticles: z.array(z.string()).default([]),
      })
    )
    .min(1),
  gaps: z
    .array(
      z.object({
        category: GapCategoryEnum,
        severity: GapSeverityEnum,
        title: nonEmpty,
        description: nonEmpty,
        remedyType: RemedyTypeEnum.nullish().transform((v) => v ?? null),
        gdprArticles: z.array(z.string()).default([]),
      })
    )
    .default([]),
});

export type Extraction = z.infer<typeof ExtractionSchema>;
export type Reasoning = z.infer<typeof ReasoningSchema>;

/**
 * Βγάζει JSON από απάντηση μοντέλου. Τα μοντέλα τυλίγουν σε code fences και
 * προσθέτουν φλυαρία ακόμη κι όταν τους ζητηθεί ρητά να μην το κάνουν.
 */
export function parseAiJson(raw: string): unknown {
  let s = (raw ?? "").trim();
  s = s.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "").trim();

  const firstObj = s.indexOf("{");
  const firstArr = s.indexOf("[");
  const start =
    firstArr !== -1 && (firstObj === -1 || firstArr < firstObj) ? firstArr : firstObj;
  const end = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Η απάντηση δεν περιέχει JSON");
  }

  return JSON.parse(s.slice(start, end + 1));
}
```

- [ ] **Step 4: Τρέξε το test**

Run: `npx vitest run src/lib/intake/schemas.test.ts`
Expected: PASS — 17 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/intake/schemas.ts src/lib/intake/schemas.test.ts
git commit -m "feat(intake): Zod schemas for AI outputs"
```

---

## Task 7: Πελάτης Gemini

Ακολουθεί το ύφος του υπάρχοντος `src/lib/deepseek.ts`: σκέτο `fetch`, καμία εξάρτηση.

**Files:**
- Create: `src/lib/gemini.ts`
- Test: `src/lib/gemini.test.ts`
- Modify: `.env.example`

- [ ] **Step 1: Γράψε το failing test**

```ts
// src/lib/gemini.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { geminiGenerate, GeminiError } from "./gemini";

const okBody = (text: string) => ({
  candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }],
});

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

describe("geminiGenerate", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GEMINI_API_KEY;
  });

  it("επιστρέφει το κείμενο της απάντησης", async () => {
    vi.stubGlobal("fetch", mockFetch(200, okBody("γεια")));
    await expect(geminiGenerate({ model: "m", parts: [{ text: "x" }] })).resolves.toBe("γεια");
  });

  it("ενώνει πολλαπλά parts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: "α" }, { text: "β" }] } }] }),
      text: async () => "",
    }));
    await expect(geminiGenerate({ model: "m", parts: [{ text: "x" }] })).resolves.toBe("αβ");
  });

  it("στέλνει το model στο URL και το κλειδί σε header", async () => {
    const f = mockFetch(200, okBody("ok"));
    vi.stubGlobal("fetch", f);
    await geminiGenerate({ model: "gemini-test-pro", parts: [{ text: "x" }] });

    const [url, init] = f.mock.calls[0];
    expect(url).toContain("/models/gemini-test-pro:generateContent");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key");
  });

  it("περνά systemInstruction και ζητά JSON όταν ζητηθεί", async () => {
    const f = mockFetch(200, okBody("{}"));
    vi.stubGlobal("fetch", f);
    await geminiGenerate({ model: "m", system: "είσαι OCR", parts: [{ text: "x" }], json: true });

    const body = JSON.parse((f.mock.calls[0][1] as RequestInit).body as string);
    expect(body.systemInstruction.parts[0].text).toBe("είσαι OCR");
    expect(body.generationConfig.responseMimeType).toBe("application/json");
  });

  it("δεν ζητά JSON όταν δεν ζητηθεί", async () => {
    const f = mockFetch(200, okBody("κείμενο"));
    vi.stubGlobal("fetch", f);
    await geminiGenerate({ model: "m", parts: [{ text: "x" }] });

    const body = JSON.parse((f.mock.calls[0][1] as RequestInit).body as string);
    expect(body.generationConfig.responseMimeType).toBeUndefined();
  });

  it("στέλνει συνημμένο αρχείο ως inlineData", async () => {
    const f = mockFetch(200, okBody("ok"));
    vi.stubGlobal("fetch", f);
    await geminiGenerate({
      model: "m",
      parts: [{ inlineData: { mimeType: "application/pdf", data: "QUJD" } }],
    });

    const body = JSON.parse((f.mock.calls[0][1] as RequestInit).body as string);
    expect(body.contents[0].parts[0].inlineData).toEqual({
      mimeType: "application/pdf",
      data: "QUJD",
    });
  });

  it("πετά GeminiError σε HTTP σφάλμα, με το status", async () => {
    vi.stubGlobal("fetch", mockFetch(429, { error: { message: "rate limited" } }));
    await expect(geminiGenerate({ model: "m", parts: [{ text: "x" }] }))
      .rejects.toMatchObject({ name: "GeminiError", status: 429 });
  });

  it("πετά όταν λείπει το κλειδί", async () => {
    delete process.env.GEMINI_API_KEY;
    vi.stubGlobal("fetch", mockFetch(200, okBody("ok")));
    await expect(geminiGenerate({ model: "m", parts: [{ text: "x" }] }))
      .rejects.toThrow(/GEMINI_API_KEY/);
  });

  it("πετά όταν η απάντηση δεν έχει candidates", async () => {
    vi.stubGlobal("fetch", mockFetch(200, { candidates: [] }));
    await expect(geminiGenerate({ model: "m", parts: [{ text: "x" }] }))
      .rejects.toThrow(GeminiError);
  });

  it("πετά όταν η απάντηση κόπηκε από φίλτρο ασφαλείας", async () => {
    vi.stubGlobal("fetch", mockFetch(200, {
      candidates: [{ content: { parts: [] }, finishReason: "SAFETY" }],
    }));
    await expect(geminiGenerate({ model: "m", parts: [{ text: "x" }] }))
      .rejects.toThrow(/SAFETY/);
  });
});
```

- [ ] **Step 2: Τρέξε το test για να δεις ότι αποτυγχάνει**

Run: `npx vitest run src/lib/gemini.test.ts`
Expected: FAIL — `Failed to resolve import "./gemini"`

- [ ] **Step 3: Γράψε την υλοποίηση**

```ts
// src/lib/gemini.ts

/**
 * Πελάτης Gemini REST — μόνο `fetch`, όπως και το `lib/deepseek.ts`.
 *
 * Στον αγωγό πρόσληψης το Gemini είναι τα ΜΑΤΙΑ: διαβάζει σκαναρισμένα PDF και
 * φωτογραφίες. Η νομική κρίση ανήκει στο DeepSeek. Τα model IDs έρχονται από
 * env ώστε να αλλάζουν χωρίς deploy.
 */

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export class GeminiError extends Error {
  readonly name = "GeminiError";
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

export interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

export interface GeminiOptions {
  model: string;
  parts: GeminiPart[];
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** Ζητά `application/json` — χρησιμοποίησέ το μαζί με Zod, όχι αντί αυτού. */
  json?: boolean;
}

/** Το μοντέλο για OCR ανά σελίδα — φθηνό και γρήγορο. */
export function liteModel(): string {
  return process.env.GEMINI_MODEL_LITE ?? "gemini-2.5-flash-lite";
}

/** Το μοντέλο για κλιμάκωση και δομημένη εξαγωγή. */
export function proModel(): string {
  return process.env.GEMINI_MODEL_PRO ?? "gemini-2.5-pro";
}

export async function geminiGenerate(opts: GeminiOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError("GEMINI_API_KEY not configured");

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: opts.parts }],
    generationConfig: {
      temperature: opts.temperature ?? 0.1,
      maxOutputTokens: opts.maxOutputTokens ?? 8192,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (opts.system) {
    body.systemInstruction = { parts: [{ text: opts.system }] };
  }

  const res = await fetch(`${BASE_URL}/${opts.model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new GeminiError(`Gemini ${res.status}: ${detail.slice(0, 500)}`, res.status);
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];
  if (!candidate) throw new GeminiError("Gemini: κενή απάντηση χωρίς candidates");

  const text: string = (candidate.content?.parts ?? [])
    .map((p: GeminiPart) => p.text ?? "")
    .join("");

  if (!text) {
    throw new GeminiError(
      `Gemini: καμία έξοδος (finishReason: ${candidate.finishReason ?? "άγνωστο"})`
    );
  }

  return text;
}
```

- [ ] **Step 4: Τρέξε το test**

Run: `npx vitest run src/lib/gemini.test.ts`
Expected: PASS — 10 tests

- [ ] **Step 5: Πρόσθεσε τις μεταβλητές στο `.env.example`**

```
# Gemini — OCR και δομημένη εξαγωγή για τον wizard πρόσληψης
GEMINI_API_KEY=
GEMINI_MODEL_LITE=gemini-2.5-flash-lite
GEMINI_MODEL_PRO=gemini-2.5-pro
INTAKE_OCR_QUALITY_THRESHOLD=0.7
INTAKE_MAX_PRO_ESCALATIONS=5
```

- [ ] **Step 6: Επιβεβαίωσε τα πραγματικά model IDs**

Τα παραπάνω είναι προεπιλογές, όχι επιβεβαιωμένα. **Πριν την πρώτη πραγματική κλήση**, άνοιξε το `https://ai.google.dev/gemini-api/docs/models` και βάλε στο `.env` τα τρέχοντα IDs για ένα φθηνό flash-lite μοντέλο και ένα pro. Αν το ID είναι λάθος, το Gemini απαντά `404` και ο `GeminiError` το δείχνει καθαρά.

- [ ] **Step 7: Commit**

```bash
git add src/lib/gemini.ts src/lib/gemini.test.ts .env.example
git commit -m "feat(intake): Gemini REST client"
```

---

## Task 8: OCR με κλιμάκωση

**Files:**
- Create: `src/lib/intake/ocr.ts`
- Test: `src/lib/intake/ocr.test.ts`

- [ ] **Step 1: Γράψε το failing test**

```ts
// src/lib/intake/ocr.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readDocument, estimatePageCount } from "./ocr";

const GOOD_TEXT = `
ΣΥΜΒΑΣΗ ΠΑΡΟΧΗΣ ΥΠΗΡΕΣΙΩΝ. Στην Αθήνα σήμερα, ΜΕΤΑΞΥ της DGSOFT ΕΕ με
ΑΦΜ 997939640 και της ΚΟΣΜΟΚΑΡ Α.Ε. με ΑΦΜ 094059163, συμφωνήθηκαν τα
ακόλουθα σχετικά με την επεξεργασία δεδομένων προσωπικού χαρακτήρα
σύμφωνα με τον Γενικό Κανονισμό 2016/679 και τα άρθρα αυτού.
`;
const JUNK = "�����".repeat(20);

const pdf = { buffer: Buffer.from("fake"), mimeType: "application/pdf", pageCount: 1 };

describe("readDocument", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_MODEL_LITE = "lite";
    process.env.GEMINI_MODEL_PRO = "pro";
  });
  afterEach(() => vi.restoreAllMocks());

  it("διαβάζει με το lite μοντέλο όταν η ποιότητα είναι καλή", async () => {
    const generate = vi.fn().mockResolvedValue(GOOD_TEXT);
    const r = await readDocument(pdf, { generate });

    expect(r.text).toBe(GOOD_TEXT);
    expect(r.model).toBe("lite");
    expect(r.escalated).toBe(false);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("κλιμακώνει στο pro όταν η ποιότητα είναι κακή", async () => {
    const generate = vi.fn()
      .mockResolvedValueOnce(JUNK)
      .mockResolvedValueOnce(GOOD_TEXT);
    const r = await readDocument(pdf, { generate });

    expect(r.text).toBe(GOOD_TEXT);
    expect(r.model).toBe("pro");
    expect(r.escalated).toBe(true);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[0][0].model).toBe("lite");
    expect(generate.mock.calls[1][0].model).toBe("pro");
  });

  it("κρατά την καλύτερη από τις δύο αναγνώσεις αν το pro βγει χειρότερο", async () => {
    const mediocre = GOOD_TEXT.slice(0, 120);
    const generate = vi.fn()
      .mockResolvedValueOnce(mediocre)
      .mockResolvedValueOnce(JUNK);
    const r = await readDocument(pdf, { generate });

    expect(r.text).toBe(mediocre);
    expect(r.escalated).toBe(true);
  });

  it("δεν κλιμακώνει όταν οι κλιμακώσεις έχουν εξαντληθεί", async () => {
    const generate = vi.fn().mockResolvedValue(JUNK);
    const r = await readDocument(pdf, { generate, escalationsLeft: 0 });

    expect(generate).toHaveBeenCalledTimes(1);
    expect(r.escalated).toBe(false);
    expect(r.model).toBe("lite");
  });

  it("στέλνει το αρχείο ως base64 inlineData", async () => {
    const generate = vi.fn().mockResolvedValue(GOOD_TEXT);
    await readDocument(pdf, { generate });

    const part = generate.mock.calls[0][0].parts.find((p: any) => p.inlineData);
    expect(part.inlineData.mimeType).toBe("application/pdf");
    expect(part.inlineData.data).toBe(Buffer.from("fake").toString("base64"));
  });

  it("για DOCX δεν καλεί καθόλου το Gemini", async () => {
    const generate = vi.fn();
    const r = await readDocument(
      {
        buffer: Buffer.from("x"),
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        pageCount: null,
      },
      { generate, extractDocx: async () => GOOD_TEXT }
    );

    expect(generate).not.toHaveBeenCalled();
    expect(r.model).toBe("docx");
    expect(r.text).toBe(GOOD_TEXT);
    expect(r.quality).toBeGreaterThan(0.5);
  });

  it("υπολογίζει σελίδες PDF από το /Count του page tree", () => {
    const buf = Buffer.from("%PDF-1.7\n1 0 obj<</Type /Pages /Kids[...] /Count 12>>endobj", "latin1");
    expect(estimatePageCount(buf, "application/pdf")).toBe(12);
  });

  it("πέφτει πίσω στην καταμέτρηση /Type /Page όταν λείπει το /Count", () => {
    const buf = Buffer.from("%PDF\n<</Type /Page >>\n<</Type /Page >>\n<</Type /Page >>", "latin1");
    expect(estimatePageCount(buf, "application/pdf")).toBe(3);
  });

  it("δεν μπερδεύει το /Type /Pages με σελίδα", () => {
    const buf = Buffer.from("%PDF\n<</Type /Pages>>", "latin1");
    expect(estimatePageCount(buf, "application/pdf")).toBeNull();
  });

  it("κάθε εικόνα είναι μία σελίδα", () => {
    expect(estimatePageCount(Buffer.from("x"), "image/jpeg")).toBe(1);
    expect(estimatePageCount(Buffer.from("x"), "image/png")).toBe(1);
  });

  it("για DOCX δεν υπολογίζει σελίδες", () => {
    expect(estimatePageCount(Buffer.from("x"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBeNull();
  });

  it("αφήνει το σφάλμα του Gemini να ανέβει", async () => {
    const generate = vi.fn().mockRejectedValue(new Error("Gemini 500"));
    await expect(readDocument(pdf, { generate })).rejects.toThrow("Gemini 500");
  });
});
```

- [ ] **Step 2: Τρέξε το test για να δεις ότι αποτυγχάνει**

Run: `npx vitest run src/lib/intake/ocr.test.ts`
Expected: FAIL — `Failed to resolve import "./ocr"`

- [ ] **Step 3: Εγκατάστησε το `mammoth`**

Run: `npm install mammoth`
Expected: `added 1 package` (ή περισσότερα, μαζί με εξαρτήσεις)

- [ ] **Step 4: Γράψε την υλοποίηση**

```ts
// src/lib/intake/ocr.ts
import { geminiGenerate, liteModel, proModel, type GeminiOptions } from "@/lib/gemini";
import { scoreOcrText, needsEscalation, DEFAULT_QUALITY_THRESHOLD } from "./quality-gate";

/**
 * Στάδια ③④: μετατροπή ενός εγγράφου σε καθαρό κείμενο, με κλιμάκωση σε
 * ισχυρότερο μοντέλο όταν η πρώτη ανάγνωση βγει κακή.
 *
 * Οι εξαρτήσεις περνούν ως παράμετροι ώστε οι δοκιμές να τρέχουν χωρίς δίκτυο.
 */

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const OCR_SYSTEM = `Είσαι μηχανή OCR για ελληνικά νομικά έγγραφα.
Επίστρεψε ΜΟΝΟ το κείμενο του εγγράφου σε markdown, διατηρώντας επικεφαλίδες,
παραγράφους και πίνακες. Μη σχολιάζεις, μη συνοψίζεις, μη μεταφράζεις.
Διατήρησε ακριβώς αριθμούς, ΑΦΜ, ημερομηνίες και επωνυμίες.
Αν μια λέξη είναι δυσανάγνωστη, γράψε την όπως τη βλέπεις χωρίς να μαντέψεις.`;

/**
 * Πόσες σελίδες έχει το αρχείο. Κρίσιμο για την πύλη ποιότητας: χωρίς αυτό,
 * μια 40σέλιδη σύμβαση που διαβάστηκε ως 300 χαρακτήρες θα περνούσε ως καθαρή.
 * `null` όταν δεν προκύπτει με βεβαιότητα — ο βαθμολογητής τότε υποθέτει μία.
 */
export function estimatePageCount(buffer: Buffer, mimeType: string): number | null {
  if (mimeType.startsWith("image/")) return 1;
  if (mimeType !== "application/pdf") return null;

  const raw = buffer.toString("latin1");

  // Το /Count του page tree είναι το αξιόπιστο σήμα όταν υπάρχει ακέραιο.
  const counts = [...raw.matchAll(/\/Type\s*\/Pages[\s\S]{0,300}?\/Count\s+(\d+)/g)]
    .map((m) => Number(m[1]))
    .filter((n) => n > 0);
  if (counts.length > 0) return Math.max(...counts);

  // Αλλιώς μετράμε αντικείμενα σελίδας. Το αρνητικό lookahead αποκλείει το
  // «/Type /Pages», που είναι ο κόμβος του δέντρου και όχι σελίδα.
  const pages = (raw.match(/\/Type\s*\/Page(?![s])/g) ?? []).length;
  return pages > 0 ? pages : null;
}

export interface SourceDocument {
  buffer: Buffer;
  mimeType: string;
  pageCount: number | null;
}

export interface ReadResult {
  text: string;
  model: string;
  quality: number;
  escalated: boolean;
}

export interface ReadDeps {
  generate?: (opts: GeminiOptions) => Promise<string>;
  extractDocx?: (buffer: Buffer) => Promise<string>;
  escalationsLeft?: number;
  threshold?: number;
}

async function defaultExtractDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

export async function readDocument(
  doc: SourceDocument,
  deps: ReadDeps = {}
): Promise<ReadResult> {
  const generate = deps.generate ?? geminiGenerate;
  const extractDocx = deps.extractDocx ?? defaultExtractDocx;
  const threshold =
    deps.threshold ??
    Number(process.env.INTAKE_OCR_QUALITY_THRESHOLD ?? DEFAULT_QUALITY_THRESHOLD);
  const escalationsLeft = deps.escalationsLeft ?? Number.POSITIVE_INFINITY;

  // Το DOCX έχει ήδη κείμενο — το OCR θα ήταν σπατάλη και χειρότερο αποτέλεσμα.
  if (doc.mimeType === DOCX_MIME) {
    const text = await extractDocx(doc.buffer);
    return {
      text,
      model: "docx",
      quality: scoreOcrText(text, doc.pageCount),
      escalated: false,
    };
  }

  const parts = [
    { text: "Μετέτρεψε αυτό το έγγραφο σε κείμενο." },
    { inlineData: { mimeType: doc.mimeType, data: doc.buffer.toString("base64") } },
  ];

  const first = await generate({ model: liteModel(), system: OCR_SYSTEM, parts });
  const firstQuality = scoreOcrText(first, doc.pageCount);

  if (!needsEscalation(firstQuality, threshold) || escalationsLeft < 1) {
    return { text: first, model: liteModel(), quality: firstQuality, escalated: false };
  }

  const second = await generate({ model: proModel(), system: OCR_SYSTEM, parts });
  const secondQuality = scoreOcrText(second, doc.pageCount);

  // Η κλιμάκωση δεν εγγυάται βελτίωση — κρατάμε την καλύτερη ανάγνωση.
  return secondQuality >= firstQuality
    ? { text: second, model: proModel(), quality: secondQuality, escalated: true }
    : { text: first, model: liteModel(), quality: firstQuality, escalated: true };
}
```

- [ ] **Step 5: Τρέξε το test**

Run: `npx vitest run src/lib/intake/ocr.test.ts`
Expected: PASS — 7 tests

- [ ] **Step 6: Commit**

```bash
git add src/lib/intake/ocr.ts src/lib/intake/ocr.test.ts package.json package-lock.json
git commit -m "feat(intake): OCR with quality-driven escalation"
```

---

## Task 9: Δομημένη εξαγωγή

**Files:**
- Create: `src/lib/intake/extraction.ts`
- Test: `src/lib/intake/extraction.test.ts`

- [ ] **Step 1: Γράψε το failing test**

```ts
// src/lib/intake/extraction.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractContract } from "./extraction";

const VALID = JSON.stringify({
  parties: [
    { name: "DGSOFT ΕΕ", vat: "997939640" },
    { name: "ΚΟΣΜΟΚΑΡ Α.Ε.", vat: "094059163" },
  ],
  subject: "Ανάπτυξη λογισμικού",
  dataCategories: ["Στοιχεία πελατών"],
});

const docs = [
  { text: "ΣΥΜΒΑΣΗ...", buffer: Buffer.from("f"), mimeType: "application/pdf" },
];

describe("extractContract", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_MODEL_PRO = "pro";
  });

  it("επιστρέφει επικυρωμένη εξαγωγή", async () => {
    const generate = vi.fn().mockResolvedValue(VALID);
    const r = await extractContract(docs, { generate });

    expect(r.parties).toHaveLength(2);
    expect(r.parties[0].vat).toBe("997939640");
    expect(r.dataCategories).toEqual(["Στοιχεία πελατών"]);
  });

  it("χρησιμοποιεί το pro μοντέλο και ζητά JSON", async () => {
    const generate = vi.fn().mockResolvedValue(VALID);
    await extractContract(docs, { generate });

    expect(generate.mock.calls[0][0].model).toBe("pro");
    expect(generate.mock.calls[0][0].json).toBe(true);
  });

  it("στέλνει και το κείμενο και το αρχείο", async () => {
    const generate = vi.fn().mockResolvedValue(VALID);
    await extractContract(docs, { generate });

    const parts = generate.mock.calls[0][0].parts;
    expect(parts.some((p: any) => p.text?.includes("ΣΥΜΒΑΣΗ"))).toBe(true);
    expect(parts.some((p: any) => p.inlineData?.mimeType === "application/pdf")).toBe(true);
  });

  it("ξεπερνά τα code fences", async () => {
    const generate = vi.fn().mockResolvedValue("```json\n" + VALID + "\n```");
    await expect(extractContract(docs, { generate })).resolves.toMatchObject({
      parties: expect.any(Array),
    });
  });

  it("ξαναπροσπαθεί μία φορά όταν η απάντηση δεν περνά το schema", async () => {
    const generate = vi.fn()
      .mockResolvedValueOnce('{"parties":[]}')
      .mockResolvedValueOnce(VALID);
    const r = await extractContract(docs, { generate });

    expect(generate).toHaveBeenCalledTimes(2);
    expect(r.parties).toHaveLength(2);
    // Η δεύτερη προσπάθεια είναι αυστηρότερη
    expect(generate.mock.calls[1][0].temperature).toBe(0);
  });

  it("πετά όταν αποτύχει και η δεύτερη προσπάθεια", async () => {
    const generate = vi.fn().mockResolvedValue('{"parties":[]}');
    await expect(extractContract(docs, { generate })).rejects.toThrow(/εξαγωγ/i);
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it("πετά όταν δεν δοθεί κανένα έγγραφο", async () => {
    const generate = vi.fn();
    await expect(extractContract([], { generate })).rejects.toThrow(/έγγραφ/i);
    expect(generate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Τρέξε το test για να δεις ότι αποτυγχάνει**

Run: `npx vitest run src/lib/intake/extraction.test.ts`
Expected: FAIL — `Failed to resolve import "./extraction"`

- [ ] **Step 3: Γράψε την υλοποίηση**

```ts
// src/lib/intake/extraction.ts
import { geminiGenerate, proModel, type GeminiOptions, type GeminiPart } from "@/lib/gemini";
import { ExtractionSchema, parseAiJson, type Extraction } from "./schemas";

/**
 * Στάδιο ⑤: από κείμενο OCR σε δομημένα γεγονότα.
 *
 * Στέλνουμε ΚΑΙ το κείμενο ΚΑΙ το αρχείο: το μοντέλο βλέπει letterhead,
 * σφραγίδες και πεδία υπογραφής που χάνονται στο σκέτο κείμενο, και εκεί
 * κρύβεται συχνά το ποιος πραγματικά υπογράφει.
 */

const SYSTEM = `Είσαι αναλυτής ελληνικών εμπορικών συμβάσεων.
Εξάγεις γεγονότα από το έγγραφο. ΔΕΝ ερμηνεύεις νομικά, ΔΕΝ αποφασίζεις ρόλους GDPR.
Αν κάτι δεν αναφέρεται στο έγγραφο, βάλε null ή κενό πίνακα — ΜΗΝ το εφευρίσκεις.
Επιστρέφεις ΜΟΝΟ JSON με αυτή τη δομή:
{
  "parties": [{ "name": "...", "vat": "...", "address": "...", "representative": "...", "email": "..." }],
  "subject": "...",
  "signedAt": "YYYY-MM-DD",
  "term": "...",
  "dataCategories": ["..."],
  "subProcessors": ["..."],
  "crossBorderTransfer": false,
  "specialCategories": false,
  "signatories": ["..."]
}
Στα "parties" βάλε ΚΑΘΕ νομικό πρόσωπο που αναφέρεται ως μέρος, υπεργολάβος ή αποδέκτης.
Το "specialCategories" είναι true μόνο αν το έγγραφο αναφέρει δεδομένα άρθρου 9 GDPR.`;

export interface ExtractionSource {
  text: string;
  buffer: Buffer;
  mimeType: string;
}

export interface ExtractionDeps {
  generate?: (opts: GeminiOptions) => Promise<string>;
}

export async function extractContract(
  sources: ExtractionSource[],
  deps: ExtractionDeps = {}
): Promise<Extraction> {
  if (sources.length === 0) {
    throw new Error("Δεν δόθηκε κανένα έγγραφο προς εξαγωγή");
  }

  const generate = deps.generate ?? geminiGenerate;

  const parts: GeminiPart[] = [];
  sources.forEach((s, i) => {
    parts.push({ text: `--- Έγγραφο ${i + 1} (κείμενο OCR) ---\n${s.text}` });
    parts.push({ inlineData: { mimeType: s.mimeType, data: s.buffer.toString("base64") } });
  });

  const attempt = async (temperature: number, extraSystem = "") => {
    const raw = await generate({
      model: proModel(),
      system: SYSTEM + extraSystem,
      parts,
      json: true,
      temperature,
    });
    return ExtractionSchema.parse(parseAiJson(raw));
  };

  try {
    return await attempt(0.1);
  } catch {
    // Μία δεύτερη προσπάθεια, αυστηρότερη. Αν ξαναποτύχει, ο χρήστης
    // συμπληρώνει με το χέρι — δεν αποθηκεύουμε ποτέ ανεπικύρωτη έξοδο.
    try {
      return await attempt(
        0,
        "\nΠΡΟΣΟΧΗ: η προηγούμενη απάντηση ήταν άκυρη. Επίστρεψε ΜΟΝΟ έγκυρο JSON " +
          "με τουλάχιστον ένα στοιχείο στο parties, το καθένα με μη κενό name."
      );
    } catch (e) {
      throw new Error(
        `Η εξαγωγή στοιχείων απέτυχε: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
}
```

- [ ] **Step 4: Τρέξε το test**

Run: `npx vitest run src/lib/intake/extraction.test.ts`
Expected: PASS — 7 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/intake/extraction.ts src/lib/intake/extraction.test.ts
git commit -m "feat(intake): structured contract extraction"
```

---

## Task 10: Προφίλ συμμόρφωσης ομίλου

Καθαρά queries — καμία κλήση AI. Απαντά στο «πού βρισκόμαστε» πριν κριθεί «τι σημαίνει αυτή η σύμβαση».

**Files:**
- Create: `src/lib/intake/compliance-profile.ts`

- [ ] **Step 1: Γράψε την υλοποίηση**

```ts
// src/lib/intake/compliance-profile.ts
import { prisma } from "@/lib/prisma";
import {
  ASSESSMENT_CATEGORIES,
  calculateCategoryScore,
  type AnswerValue,
} from "@/lib/assessment-questions";
import type { MatchCandidate } from "./company-match";

/**
 * Read-only στιγμιότυπο της συμμόρφωσης του ΟΜΙΛΟΥ.
 *
 * Δίνεται ως context στο DeepSeek ώστε η κρίση να μην είναι «τι λέει το χαρτί»
 * αλλά «τι σημαίνει αυτό το χαρτί για εμάς, δεδομένου του πού βρισκόμαστε».
 * Αποθηκεύεται στο `ComplianceIntake.profileSnapshot` ως τεκμήριο: έξι μήνες
 * μετά πρέπει να φαίνεται με ΤΙ δεδομένα ελήφθη η απόφαση.
 */

export interface ComplianceProfile {
  mother: { name: string; vatNumber: string | null; domains: string[] };
  subsidiaries: { name: string; vatNumber: string | null }[];
  assessment: { overall: number; weakCategories: string[] };
  policies: { active: string[]; missing: string[]; expired: string[] };
  ropaDepartments: string[];
  hasDpo: boolean;
  trainingPassRate: number | null;
  existingDpaCompanyIds: string[];
  knownSubProcessors: string[];
}

/** Οι εταιρίες που είμαστε «εμείς» — μαμά και θυγατρικές — για αντιστοίχιση. */
export async function getOwnGroupCandidates(): Promise<MatchCandidate[]> {
  const [org, companies] = await Promise.all([
    prisma.organization.findFirst({ orderBy: { createdAt: "asc" } }),
    prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, name: true, legalName: true, vatNumber: true, relationships: true },
    }),
  ]);

  const candidates: MatchCandidate[] = [];

  if (org) {
    candidates.push({
      id: "org",
      name: org.name,
      legalName: org.legalName,
      vatNumber: org.vatNumber,
      side: "OWN_MOTHER",
    });
  }

  for (const c of companies) {
    const rels = Array.isArray(c.relationships) ? (c.relationships as unknown[]) : [];
    const isSubsidiary = rels.some((r) => r === "SUBSIDIARY");
    candidates.push({
      id: c.id,
      name: c.name,
      legalName: c.legalName,
      vatNumber: c.vatNumber,
      side: isSubsidiary ? "OWN_GROUP" : "EXTERNAL",
    });
  }

  return candidates;
}

export async function buildComplianceProfile(): Promise<ComplianceProfile> {
  const [org, companies, assessments, policies, flows, keyPositions, training, dpas, providerDpas] =
    await Promise.all([
      prisma.organization.findFirst({ orderBy: { createdAt: "asc" } }),
      prisma.company.findMany({
        where: { isActive: true },
        select: { name: true, vatNumber: true, relationships: true },
      }),
      prisma.assessment.findMany({ select: { title: true, answers: true } }),
      prisma.policyDocument.findMany({ select: { type: true, status: true, reviewDate: true } }),
      prisma.departmentFlow.findMany({ select: { department: true } }),
      prisma.position.count({ where: { isKeyRole: true } }),
      prisma.trainingResult.findMany({ select: { passed: true } }),
      prisma.dpaContract.findMany({ where: { companyId: { not: null } }, select: { companyId: true } }),
      prisma.providerDpa.findMany({ select: { providerName: true } }),
    ]);

  const subsidiaries = companies
    .filter((c) => (Array.isArray(c.relationships) ? c.relationships : []).some((r) => r === "SUBSIDIARY"))
    .map((c) => ({ name: c.name, vatNumber: c.vatNumber }));

  // Assessment: score ανά κατηγορία, κρατάμε τις αδύναμες
  const weakCategories: string[] = [];
  let total = 0;
  let counted = 0;
  for (const cat of ASSESSMENT_CATEGORIES) {
    const row = assessments.find((a) => a.title === cat.id);
    // `Assessment.title` κρατά το ID της κατηγορίας — έτσι το διαβάζει και το dashboard.
    const answers = (row?.answers ?? {}) as Record<string, AnswerValue>;
    const { percentage } = calculateCategoryScore(cat.questions, answers);
    total += percentage;
    counted += 1;
    if (percentage < 70) weakCategories.push(cat.title);
  }

  const now = new Date();
  const activeTypes = policies.filter((p) => p.status === "ACTIVE").map((p) => p.type as string);
  const expired = policies
    .filter((p) => p.status === "ACTIVE" && p.reviewDate && p.reviewDate < now)
    .map((p) => p.type as string);
  const allTypes = [...new Set(policies.map((p) => p.type as string))];
  const missing = POLICY_ESSENTIALS.filter((t) => !activeTypes.includes(t) && !allTypes.includes(t));

  const passRate =
    training.length === 0 ? null : training.filter((t) => t.passed).length / training.length;

  return {
    mother: {
      name: org?.name ?? "—",
      vatNumber: org?.vatNumber ?? null,
      domains: Array.isArray(org?.domains) ? (org!.domains as string[]) : [],
    },
    subsidiaries,
    assessment: {
      overall: counted === 0 ? 0 : Math.round(total / counted),
      weakCategories,
    },
    policies: { active: activeTypes, missing, expired: [...new Set(expired)] },
    ropaDepartments: flows.map((f) => f.department),
    hasDpo: keyPositions > 0,
    trainingPassRate: passRate,
    existingDpaCompanyIds: [...new Set(dpas.map((d) => d.companyId!).filter(Boolean))],
    knownSubProcessors: [...new Set(providerDpas.map((p) => p.providerName))],
  };
}

/** Οι πολιτικές χωρίς τις οποίες δεν στέκει φάκελος συμμόρφωσης σε έλεγχο. */
const POLICY_ESSENTIALS = [
  "SECURITY_POLICY",
  "DATA_RETENTION",
  "INCIDENT_RESPONSE",
  "ACCESS_CONTROL",
  "PRIVACY_NOTICE",
  "DATA_BREACH",
  "VENDOR_MANAGEMENT",
];
```

- [ ] **Step 2: Επιβεβαίωσε ότι μεταγλωττίζεται και τρέχει σε πραγματικά δεδομένα**

Run:
```bash
npx tsc --noEmit && npx tsx -e "
import { buildComplianceProfile, getOwnGroupCandidates } from './src/lib/intake/compliance-profile';
(async () => {
  console.log(JSON.stringify(await buildComplianceProfile(), null, 1));
  console.log('υποψήφιοι:', (await getOwnGroupCandidates()).length);
  process.exit(0);
})();
"
```

Expected: JSON με `mother.vatNumber` γεμάτο, λίστα πολιτικών, και αριθμό υποψηφίων ≥ 1.

- [ ] **Step 3: Commit**

```bash
git add src/lib/intake/compliance-profile.ts
git commit -m "feat(intake): group compliance profile snapshot"
```

---

## Task 11: Νομική κρίση με DeepSeek

**Files:**
- Create: `src/lib/intake/reasoning.ts`
- Test: `src/lib/intake/reasoning.test.ts`

- [ ] **Step 1: Γράψε το failing test**

```ts
// src/lib/intake/reasoning.test.ts
import { describe, it, expect, vi } from "vitest";
import { reasonAboutRoles } from "./reasoning";
import type { ComplianceProfile } from "./compliance-profile";
import type { Extraction } from "./schemas";

const profile: ComplianceProfile = {
  mother: { name: "DGSOFT", vatNumber: "997939640", domains: ["dgsoft.gr"] },
  subsidiaries: [],
  assessment: { overall: 90, weakCategories: [] },
  policies: { active: ["SECURITY_POLICY"], missing: ["DATA_BREACH"], expired: [] },
  ropaDepartments: ["IT"],
  hasDpo: true,
  trainingPassRate: 0.8,
  existingDpaCompanyIds: [],
  knownSubProcessors: [],
};

const extraction: Extraction = {
  parties: [
    { name: "DGSOFT ΕΕ", vat: "997939640", address: null, representative: null, email: null },
    { name: "ΚΟΣΜΟΚΑΡ Α.Ε.", vat: "094059163", address: null, representative: null, email: null },
  ],
  subject: "Ανάπτυξη λογισμικού",
  signedAt: null,
  term: null,
  dataCategories: ["Στοιχεία πελατών"],
  subProcessors: [],
  crossBorderTransfer: false,
  specialCategories: false,
  signatories: [],
};

const VALID = JSON.stringify({
  partyRoles: [
    { name: "DGSOFT ΕΕ", role: "PROCESSOR", rationale: "Κατ' εντολή.", gdprArticles: ["28"] },
    { name: "ΚΟΣΜΟΚΑΡ Α.Ε.", role: "CONTROLLER", rationale: "Καθορίζει σκοπούς.", gdprArticles: ["24"] },
  ],
  gaps: [
    { category: "CONTRACT", severity: "CRITICAL", title: "Λείπει DPA",
      description: "Δεν υπάρχει σύμβαση άρθρου 28.", remedyType: "CREATE_DPA", gdprArticles: ["28"] },
  ],
});

describe("reasonAboutRoles", () => {
  it("επιστρέφει επικυρωμένη κρίση", async () => {
    const chat = vi.fn().mockResolvedValue(VALID);
    const r = await reasonAboutRoles(extraction, profile, { chat });

    expect(r.partyRoles).toHaveLength(2);
    expect(r.gaps[0].remedyType).toBe("CREATE_DPA");
  });

  it("περνά το προφίλ και τα μέρη στο prompt", async () => {
    const chat = vi.fn().mockResolvedValue(VALID);
    await reasonAboutRoles(extraction, profile, { chat });

    const user = chat.mock.calls[0][0].user;
    expect(user).toContain("ΚΟΣΜΟΚΑΡ");
    expect(user).toContain("997939640");
    expect(user).toContain("DATA_BREACH");
  });

  it("ξαναπροσπαθεί μία φορά σε άκυρη απάντηση", async () => {
    const chat = vi.fn()
      .mockResolvedValueOnce('{"partyRoles":[{"name":"Χ","role":"ΑΓΝΩΣΤΟΣ"}]}')
      .mockResolvedValueOnce(VALID);
    const r = await reasonAboutRoles(extraction, profile, { chat });

    expect(chat).toHaveBeenCalledTimes(2);
    expect(r.partyRoles).toHaveLength(2);
  });

  it("πετά όταν αποτύχουν και οι δύο προσπάθειες", async () => {
    const chat = vi.fn().mockResolvedValue("δεν ξέρω");
    await expect(reasonAboutRoles(extraction, profile, { chat })).rejects.toThrow(/κρίση/i);
    expect(chat).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Τρέξε το test για να δεις ότι αποτυγχάνει**

Run: `npx vitest run src/lib/intake/reasoning.test.ts`
Expected: FAIL — `Failed to resolve import "./reasoning"`

- [ ] **Step 3: Γράψε την υλοποίηση**

```ts
// src/lib/intake/reasoning.ts
import { deepseekChat } from "@/lib/deepseek";
import { ReasoningSchema, parseAiJson, type Extraction, type Reasoning } from "./schemas";
import type { ComplianceProfile } from "./compliance-profile";

/**
 * Στάδιο ⑦: από γεγονότα σε νομική κρίση.
 *
 * Το DeepSeek δεν βλέπει ποτέ pixel — μόνο τα δομημένα γεγονότα της εξαγωγής
 * και το προφίλ συμμόρφωσης του ομίλου. Έτσι ένα σφάλμα OCR δεν μεταμφιέζεται
 * σε λάθος νομικό συμπέρασμα, και το «γιατί» της κρίσης μένει ελέγξιμο.
 */

const SYSTEM = `Είσαι νομικός σύμβουλος GDPR για ελληνικές εταιρείες λογισμικού και ERP integrators.
Κρίνεις τον ρόλο κάθε συμβαλλόμενου κατά GDPR και εντοπίζεις κενά συμμόρφωσης.
Επιστρέφεις ΜΟΝΟ έγκυρο JSON, χωρίς markdown, χωρίς code blocks, χωρίς εξηγήσεις εκτός JSON.

Δομή:
{
  "partyRoles": [{ "name": "<ακριβώς όπως δόθηκε>", "role": "CONTROLLER|PROCESSOR|JOINT_CONTROLLER|SUB_PROCESSOR|RECIPIENT|THIRD_PARTY", "rationale": "μία-δύο προτάσεις", "gdprArticles": ["28"] }],
  "gaps": [{ "category": "POLICY|DPIA|ROPA|TRAINING|TECHNICAL|CONTRACT|DPO", "severity": "CRITICAL|HIGH|MEDIUM|LOW", "title": "...", "description": "...", "remedyType": "CREATE_POLICY|CREATE_DPIA|CREATE_DPA|CREATE_JCA|CREATE_ROPA_ENTRY|CREATE_ASSESSMENT|ASSIGN_DPO|CREATE_TRAINING", "gdprArticles": ["..."] }]
}

Κανόνες:
- Δώσε ρόλο για ΚΑΘΕ μέρος που σου δόθηκε, με το ίδιο ακριβώς "name".
- Τα κενά αφορούν ΤΗ ΔΙΚΗ ΜΑΣ πλευρά, με βάση το προφίλ συμμόρφωσης — όχι γενικές συμβουλές.
- CRITICAL μόνο όταν η έλλειψη συνιστά παράβαση, π.χ. απουσία DPA όπου απαιτείται άρθρο 28,
  ή απουσία DPIA όπου απαιτείται άρθρο 35.
- Μην προτείνεις κενό που ήδη καλύπτεται από το προφίλ.`;

export interface ReasoningDeps {
  chat?: (p: { system: string; user: string; temperature?: number; maxTokens?: number }) => Promise<string>;
}

function buildUserPrompt(extraction: Extraction, profile: ComplianceProfile): string {
  return `ΤΑ ΔΙΚΑ ΜΑΣ ΣΤΟΙΧΕΙΑ (όμιλος)
Μαμά: ${profile.mother.name} — ΑΦΜ ${profile.mother.vatNumber ?? "—"} — domains: ${profile.mother.domains.join(", ") || "—"}
Θυγατρικές: ${profile.subsidiaries.map((s) => `${s.name} (${s.vatNumber ?? "—"})`).join("; ") || "καμία"}

ΚΑΤΑΣΤΑΣΗ ΣΥΜΜΟΡΦΩΣΗΣ
Συνολικό score αξιολόγησης: ${profile.assessment.overall}%
Αδύναμες κατηγορίες: ${profile.assessment.weakCategories.join(", ") || "καμία"}
Ενεργές πολιτικές: ${profile.policies.active.join(", ") || "καμία"}
Πολιτικές που λείπουν: ${profile.policies.missing.join(", ") || "καμία"}
Πολιτικές ληγμένες: ${profile.policies.expired.join(", ") || "καμία"}
RoPA ανά τμήμα: ${profile.ropaDepartments.join(", ") || "καμία καταγραφή"}
Ορισμένος ΥΠΔ/DPO: ${profile.hasDpo ? "ναι" : "όχι"}
Ποσοστό επιτυχίας εκπαίδευσης: ${profile.trainingPassRate === null ? "καμία εκπαίδευση" : `${Math.round(profile.trainingPassRate * 100)}%`}
Γνωστοί υποεκτελούντες: ${profile.knownSubProcessors.join(", ") || "κανένας"}

Η ΣΥΜΒΑΣΗ
Αντικείμενο: ${extraction.subject ?? "—"}
Διάρκεια: ${extraction.term ?? "—"}
Ημερομηνία: ${extraction.signedAt ?? "—"}
Κατηγορίες δεδομένων: ${extraction.dataCategories.join(", ") || "δεν αναφέρονται"}
Υπεργολάβοι στη σύμβαση: ${extraction.subProcessors.join(", ") || "κανένας"}
Διασυνοριακή μεταφορά: ${extraction.crossBorderTransfer ? "ναι" : "όχι"}
Ειδικές κατηγορίες (άρθρο 9): ${extraction.specialCategories ? "ναι" : "όχι"}

ΤΑ ΜΕΡΗ
${extraction.parties.map((p, i) => `${i + 1}. ${p.name} — ΑΦΜ ${p.vat ?? "—"} — εκπρόσωπος ${p.representative ?? "—"}`).join("\n")}`;
}

export async function reasonAboutRoles(
  extraction: Extraction,
  profile: ComplianceProfile,
  deps: ReasoningDeps = {}
): Promise<Reasoning> {
  const chat = deps.chat ?? deepseekChat;
  const user = buildUserPrompt(extraction, profile);

  const attempt = async (temperature: number, extra = "") =>
    ReasoningSchema.parse(
      parseAiJson(
        await chat({ system: SYSTEM + extra, user, temperature, maxTokens: 4000 })
      )
    );

  try {
    return await attempt(0.2);
  } catch {
    try {
      return await attempt(
        0,
        "\nΠΡΟΣΟΧΗ: η προηγούμενη απάντηση ήταν άκυρη. Χρησιμοποίησε ΜΟΝΟ τις " +
          "επιτρεπτές τιμές των enum και επίστρεψε ΜΟΝΟ JSON."
      );
    } catch (e) {
      throw new Error(
        `Η νομική κρίση απέτυχε: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
}
```

- [ ] **Step 4: Τρέξε το test**

Run: `npx vitest run src/lib/intake/reasoning.test.ts`
Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/intake/reasoning.ts src/lib/intake/reasoning.test.ts
git commit -m "feat(intake): GDPR role reasoning via DeepSeek"
```

---

## Task 12: Server actions

**Files:**
- Create: `src/actions/intake.ts`

- [ ] **Step 1: Γράψε την υλοποίηση**

```ts
// src/actions/intake.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";
import { logAction } from "@/lib/action-logger";
import { uploadToBunny } from "@/lib/bunny";
import { revalidatePath } from "next/cache";
import { createHash } from "crypto";
import { buildComplianceProfile, getOwnGroupCandidates } from "@/lib/intake/compliance-profile";
import { matchParty } from "@/lib/intake/company-match";
import { canCommit, type GapState, type PartyState } from "@/lib/intake/blocking-rule";
import { toDpaRole, type PartyRoleValue } from "@/lib/intake/role-mapping";
import type { Extraction, Reasoning } from "@/lib/intake/schemas";

const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_BYTES = 20 * 1024 * 1024;
const MAX_FILES = 20;

export async function createIntake(title: string) {
  const userId = await requireUserId();
  const clean = title.trim();
  if (!clean) throw new Error("Ο τίτλος είναι υποχρεωτικός");

  // Το προφίλ αποθηκεύεται ΤΩΡΑ ως τεκμήριο: πρέπει να φαίνεται με τι δεδομένα
  // ελήφθη η απόφαση, ακόμη κι αν η συμμόρφωση αλλάξει αύριο.
  const profile = await buildComplianceProfile();

  const intake = await prisma.complianceIntake.create({
    data: { userId, title: clean, profileSnapshot: profile as never },
  });

  await logAction({ action: "CREATE", entity: "ComplianceIntake", entityId: intake.id });
  revalidatePath("/intake");
  return intake.id;
}

export async function addIntakeDocument(intakeId: string, formData: FormData) {
  await requireUserId();

  const file = formData.get("file") as File | null;
  const kind = (formData.get("kind") as string) || "CONTRACT";
  if (!file) throw new Error("Δεν δόθηκε αρχείο");

  if (!ALLOWED_MIME.includes(file.type)) {
    throw new Error(`Μη υποστηριζόμενος τύπος αρχείου: ${file.type || "άγνωστος"}`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`Το αρχείο ξεπερνά τα 20 MB (${Math.round(file.size / 1024 / 1024)} MB)`);
  }

  const count = await prisma.intakeDocument.count({ where: { intakeId } });
  if (count >= MAX_FILES) throw new Error(`Έως ${MAX_FILES} αρχεία ανά πρόσληψη`);

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileHash = createHash("sha256").update(buffer).digest("hex");

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const remotePath = `intake/${intakeId}/${fileHash.slice(0, 12)}.${ext}`;
  const fileUrl = await uploadToBunny(buffer, remotePath, file.type);

  const doc = await prisma.intakeDocument.create({
    data: {
      intakeId,
      fileName: file.name,
      fileUrl,
      fileHash,
      mimeType: file.type,
      sizeBytes: file.size,
      kind: kind as never,
    },
  });

  revalidatePath(`/intake/${intakeId}`);
  return doc.id;
}

/** Άλλα intakes που περιέχουν ήδη το ίδιο αρχείο — προειδοποίηση, όχι εμπόδιο. */
export async function findDuplicateDocuments(intakeId: string) {
  const docs = await prisma.intakeDocument.findMany({
    where: { intakeId },
    select: { fileHash: true, fileName: true },
  });
  if (docs.length === 0) return [];

  const dupes = await prisma.intakeDocument.findMany({
    where: { fileHash: { in: docs.map((d) => d.fileHash) }, intakeId: { not: intakeId } },
    select: { fileHash: true, intakeId: true, intake: { select: { title: true } } },
  });

  return dupes.map((d) => ({
    fileName: docs.find((x) => x.fileHash === d.fileHash)?.fileName ?? "",
    otherIntakeId: d.intakeId,
    otherIntakeTitle: d.intake.title,
  }));
}

/** Γράφει τα εξαχθέντα μέρη ως `IntakeParty`, με αντιστοίχιση και side. */
export async function persistExtraction(intakeId: string, extraction: Extraction) {
  await requireUserId();
  const candidates = await getOwnGroupCandidates();

  await prisma.$transaction(async (tx) => {
    await tx.intakeParty.deleteMany({ where: { intakeId } });

    for (const p of extraction.parties) {
      const match = matchParty({ name: p.name, vat: p.vat }, candidates);
      await tx.intakeParty.create({
        data: {
          intakeId,
          // "org" είναι η μαμά (Organization), όχι εγγραφή Company.
          companyId: match && match.candidateId !== "org" ? match.candidateId : null,
          side: (match?.side ?? "EXTERNAL") as never,
          matchMethod: (match?.method ?? "NONE") as never,
          matchScore: match?.score ?? null,
          extractedName: p.name,
          extractedVat: p.vat,
          extractedAddress: p.address,
          extractedRep: p.representative,
          extractedEmail: p.email,
        },
      });
    }

    await tx.complianceIntake.update({
      where: { id: intakeId },
      data: { extraction: extraction as never, stage: "MATCHING", status: "PROCESSING" },
    });
  });

  revalidatePath(`/intake/${intakeId}`);
}

/** Γράφει τους προτεινόμενους ρόλους και τα κενά. */
export async function persistReasoning(intakeId: string, reasoning: Reasoning) {
  await requireUserId();
  const parties = await prisma.intakeParty.findMany({ where: { intakeId } });

  await prisma.$transaction(async (tx) => {
    for (const pr of reasoning.partyRoles) {
      const party = parties.find((p) => p.extractedName === pr.name);
      if (!party) continue; // ό,τι δεν αντιστοιχεί σε μέρος αγνοείται σιωπηλά
      await tx.intakeParty.update({
        where: { id: party.id },
        data: {
          proposedRole: pr.role as never,
          confirmedRole: pr.role as never, // προσυμπληρωμένο· ο χρήστης το αλλάζει
          roleRationale: pr.rationale,
          gdprArticles: pr.gdprArticles as never,
        },
      });
    }

    await tx.intakeGap.deleteMany({ where: { intakeId } });
    for (const g of reasoning.gaps) {
      await tx.intakeGap.create({
        data: {
          intakeId,
          category: g.category as never,
          severity: g.severity as never,
          title: g.title,
          description: g.description,
          remedyType: g.remedyType as never,
          gdprArticles: g.gdprArticles as never,
        },
      });
    }

    await tx.complianceIntake.update({
      where: { id: intakeId },
      data: { reasoning: reasoning as never, stage: "REVIEW", status: "AWAITING_REVIEW" },
    });
  });

  revalidatePath(`/intake/${intakeId}`);
}

export async function setPartyRole(partyId: string, role: PartyRoleValue, side: string) {
  await requireUserId();
  const party = await prisma.intakeParty.update({
    where: { id: partyId },
    data: { confirmedRole: role as never, side: side as never },
  });
  revalidatePath(`/intake/${party.intakeId}`);
}

export async function setGapStatus(gapId: string, status: string, dismissReason?: string) {
  await requireUserId();
  if (status === "DISMISSED" && !dismissReason?.trim()) {
    throw new Error("Η απόρριψη κενού απαιτεί αιτιολογία");
  }
  const gap = await prisma.intakeGap.update({
    where: { id: gapId },
    data: { status: status as never, dismissReason: dismissReason?.trim() || null },
  });
  revalidatePath(`/intake/${gap.intakeId}`);
}

/** Τι εμποδίζει το commit — για να το δείχνει το UI πριν πατηθεί το κουμπί. */
export async function checkCommit(intakeId: string) {
  const [parties, gaps] = await Promise.all([
    prisma.intakeParty.findMany({ where: { intakeId }, select: { side: true, confirmedRole: true } }),
    prisma.intakeGap.findMany({ where: { intakeId }, select: { severity: true, status: true, dismissReason: true } }),
  ]);
  return canCommit(parties as PartyState[], gaps as GapState[]);
}

const RISK_BY_SEVERITY: Record<string, "CRITICAL" | "HIGH" | "MEDIUM"> = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
};

export async function commitIntake(intakeId: string) {
  const userId = await requireUserId();

  const verdict = await checkCommit(intakeId);
  if (!verdict.allowed) throw new Error(verdict.reasons.join(" "));

  const [intake, parties, gaps] = await Promise.all([
    prisma.complianceIntake.findUniqueOrThrow({ where: { id: intakeId } }),
    prisma.intakeParty.findMany({ where: { intakeId } }),
    prisma.intakeGap.findMany({ where: { intakeId } }),
  ]);

  const external = parties.filter((p) => p.side === "EXTERNAL");
  const clientName = external[0]?.extractedName ?? "—";

  const openSeverities = gaps.filter((g) => g.status !== "DISMISSED").map((g) => g.severity as string);
  const riskLevel =
    RISK_BY_SEVERITY[openSeverities.find((s) => RISK_BY_SEVERITY[s]) ?? ""] ?? "MEDIUM";

  const projectId = await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        name: intake.title,
        clientName,
        description: (intake.extraction as { subject?: string } | null)?.subject ?? null,
        riskLevel: riskLevel as never,
      },
    });

    // Ο ρόλος μας ↔ ρόλος αντισυμβαλλομένου → DpaContract ανά έγκυρο ζεύγος
    for (const ours of parties.filter((p) => p.side !== "EXTERNAL")) {
      for (const theirs of external) {
        const dpaRole = toDpaRole(
          ours.confirmedRole as PartyRoleValue,
          theirs.confirmedRole as PartyRoleValue
        );
        if (!dpaRole) continue;

        const weAreController = dpaRole === "COMPANY_AS_PROCESSOR";
        await tx.dpaContract.create({
          data: {
            projectId: project.id,
            userId,
            companyId: theirs.companyId,
            roleInDpa: dpaRole as never,
            title: `DPA — ${ours.extractedName} / ${theirs.extractedName}`,
            controllerName: weAreController ? ours.extractedName : theirs.extractedName,
            controllerVat: weAreController ? ours.extractedVat : theirs.extractedVat,
            processorName: weAreController ? theirs.extractedName : ours.extractedName,
            processorVat: weAreController ? theirs.extractedVat : ours.extractedVat,
            dataCategories: ((intake.extraction as { dataCategories?: string[] } | null)?.dataCategories ?? []) as never,
            purposes: [] as never,
            retentionPeriod: "Προς συμπλήρωση",
            status: "PENDING",
          },
        });
      }
    }

    await tx.complianceIntake.update({
      where: { id: intakeId },
      data: { projectId: project.id, status: "COMMITTED" },
    });

    return project.id;
  });

  await logAction({
    action: "COMMIT",
    entity: "ComplianceIntake",
    entityId: intakeId,
    projectId,
    details: { parties: parties.length, gaps: gaps.length },
  });

  revalidatePath("/intake");
  revalidatePath(`/intake/${intakeId}`);
  return projectId;
}
```

- [ ] **Step 2: Επιβεβαίωσε ότι μεταγλωττίζεται**

Run: `npx tsc --noEmit`
Expected: καμία έξοδος

- [ ] **Step 3: Επιβεβαίωσε ότι το lint δεν χειροτέρεψε**

Run: `npx eslint src/actions/intake.ts src/lib/intake`
Expected: καμία γραμμή `error`

- [ ] **Step 4: Commit**

```bash
git add src/actions/intake.ts
git commit -m "feat(intake): server actions for intake lifecycle"
```

---

## Task 13: API routes για τα βαριά στάδια

Ένα request ανά έγγραφο: μια 40σέλιδη σύμβαση δεν διαβάζεται μέσα σε ένα request.

**Files:**
- Create: `src/app/api/intake/ocr/route.ts`
- Create: `src/app/api/intake/analyze/route.ts`

- [ ] **Step 1: Γράψε το OCR route**

```ts
// src/app/api/intake/ocr/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";
import { readDocument, estimatePageCount } from "@/lib/intake/ocr";

export const maxDuration = 300;

/** Διαβάζει ΕΝΑ έγγραφο. Ο client καλεί παράλληλα, ένα request ανά αρχείο. */
export async function POST(req: NextRequest) {
  try {
    await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { documentId } = await req.json();
  if (!documentId) return NextResponse.json({ error: "Λείπει το documentId" }, { status: 400 });

  const doc = await prisma.intakeDocument.findUnique({ where: { id: documentId } });
  if (!doc) return NextResponse.json({ error: "Το έγγραφο δεν βρέθηκε" }, { status: 404 });

  await prisma.intakeDocument.update({
    where: { id: doc.id },
    data: { ocrStatus: "RUNNING", ocrError: null },
  });

  try {
    const escalationsUsed = await prisma.intakeDocument.count({
      where: { intakeId: doc.intakeId, escalated: true },
    });
    const maxEscalations = Number(process.env.INTAKE_MAX_PRO_ESCALATIONS ?? 5);

    const res = await fetch(doc.fileUrl);
    if (!res.ok) throw new Error(`Δεν κατέβηκε το αρχείο (${res.status})`);
    const buffer = Buffer.from(await res.arrayBuffer());

    const pageCount = doc.pageCount ?? estimatePageCount(buffer, doc.mimeType);

    const result = await readDocument(
      { buffer, mimeType: doc.mimeType, pageCount },
      { escalationsLeft: Math.max(0, maxEscalations - escalationsUsed) }
    );

    await prisma.intakeDocument.update({
      where: { id: doc.id },
      data: {
        pageCount,
        ocrText: result.text,
        ocrModel: result.model,
        ocrQuality: result.quality,
        escalated: result.escalated,
        ocrStatus: "DONE",
      },
    });

    return NextResponse.json({
      quality: result.quality,
      model: result.model,
      escalated: result.escalated,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // Η αποτυχία απομονώνεται στο έγγραφο — τα υπόλοιπα συνεχίζουν.
    await prisma.intakeDocument.update({
      where: { id: doc.id },
      data: { ocrStatus: "FAILED", ocrError: message },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Γράψε το analyze route (εξαγωγή + κρίση)**

```ts
// src/app/api/intake/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";
import { extractContract } from "@/lib/intake/extraction";
import { reasonAboutRoles } from "@/lib/intake/reasoning";
import { persistExtraction, persistReasoning } from "@/actions/intake";
import type { ComplianceProfile } from "@/lib/intake/compliance-profile";
import { buildComplianceProfile } from "@/lib/intake/compliance-profile";

export const maxDuration = 300;

/** Στάδια ⑤⑦ μαζί: εξαγωγή με Gemini, μετά νομική κρίση με DeepSeek. */
export async function POST(req: NextRequest) {
  try {
    await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { intakeId } = await req.json();
  if (!intakeId) return NextResponse.json({ error: "Λείπει το intakeId" }, { status: 400 });

  const intake = await prisma.complianceIntake.findUnique({
    where: { id: intakeId },
    include: { documents: true },
  });
  if (!intake) return NextResponse.json({ error: "Δεν βρέθηκε" }, { status: 404 });

  const readable = intake.documents.filter((d) => d.ocrText && d.ocrText.trim().length > 0);
  if (readable.length === 0) {
    return NextResponse.json({ error: "Κανένα έγγραφο δεν έχει διαβαστεί" }, { status: 400 });
  }

  try {
    await prisma.complianceIntake.update({
      where: { id: intakeId },
      data: { stage: "EXTRACTION", status: "PROCESSING", lastError: null },
    });

    const sources = await Promise.all(
      readable.map(async (d) => {
        const res = await fetch(d.fileUrl);
        return {
          text: d.ocrText!,
          buffer: Buffer.from(await res.arrayBuffer()),
          mimeType: d.mimeType,
        };
      })
    );

    const extraction = await extractContract(sources);
    await persistExtraction(intakeId, extraction);

    await prisma.complianceIntake.update({
      where: { id: intakeId },
      data: { stage: "REASONING" },
    });

    // Το αποθηκευμένο snapshot είναι το τεκμήριο· αν λείπει, χτίζεται τώρα.
    const profile =
      (intake.profileSnapshot as ComplianceProfile | null) ?? (await buildComplianceProfile());

    const reasoning = await reasonAboutRoles(extraction, profile);
    await persistReasoning(intakeId, reasoning);

    return NextResponse.json({
      parties: extraction.parties.length,
      gaps: reasoning.gaps.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await prisma.complianceIntake.update({
      where: { id: intakeId },
      data: { status: "FAILED", lastError: message },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Επιβεβαίωσε build**

Run: `npx tsc --noEmit && npm run build`
Expected: `✓ Compiled successfully`, και τα routes `/api/intake/ocr` και `/api/intake/analyze` στη λίστα

- [ ] **Step 4: Commit**

```bash
git add src/app/api/intake
git commit -m "feat(intake): OCR and analyze API routes"
```

---

## Task 14: Δοκιμή αποδοχής με πραγματικές συμβάσεις

Αυτό είναι η **πύλη για το Στάδιο 2**. Χωρίς αριθμούς από πραγματικά έγγραφα, δεν ξέρουμε αν ο αγωγός αξίζει UI.

**Files:**
- Create: `scripts/intake-smoke.ts`

- [ ] **Step 1: Γράψε το script**

```ts
// scripts/intake-smoke.ts
/**
 * Περνά ένα πραγματικό αρχείο από όλον τον αγωγό, χωρίς βάση και χωρίς UI.
 *
 *   npx tsx scripts/intake-smoke.ts ./δείγματα/συμβαση1.pdf
 *
 * Τυπώνει: ποιότητα OCR, αν χρειάστηκε κλιμάκωση, τα μέρη με τα ΑΦΜ τους,
 * την αντιστοίχιση με τον όμιλο, τους προτεινόμενους ρόλους και τα κενά.
 */
import { readFile } from "fs/promises";
import { basename, extname } from "path";
import { readDocument, estimatePageCount } from "../src/lib/intake/ocr";
import { extractContract } from "../src/lib/intake/extraction";
import { reasonAboutRoles } from "../src/lib/intake/reasoning";
import { buildComplianceProfile, getOwnGroupCandidates } from "../src/lib/intake/compliance-profile";
import { matchParty } from "../src/lib/intake/company-match";

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Χρήση: npx tsx scripts/intake-smoke.ts <αρχείο>");
    process.exit(1);
  }

  const mimeType = MIME[extname(path).toLowerCase()];
  if (!mimeType) {
    console.error(`Μη υποστηριζόμενη κατάληξη: ${extname(path)}`);
    process.exit(1);
  }

  const buffer = await readFile(path);
  console.log(`\n▸ ${basename(path)} (${Math.round(buffer.length / 1024)} KB)\n`);

  const pageCount = estimatePageCount(buffer, mimeType);
  console.log(`  σελίδες: ${pageCount ?? "άγνωστο"}`);

  console.time("OCR");
  const ocr = await readDocument({ buffer, mimeType, pageCount });
  console.timeEnd("OCR");
  console.log(`  ποιότητα: ${ocr.quality.toFixed(2)}  μοντέλο: ${ocr.model}  κλιμάκωση: ${ocr.escalated ? "ΝΑΙ" : "όχι"}`);
  console.log(`  χαρακτήρες: ${ocr.text.length}\n`);

  console.time("Εξαγωγή");
  const extraction = await extractContract([{ text: ocr.text, buffer, mimeType }]);
  console.timeEnd("Εξαγωγή");

  const candidates = await getOwnGroupCandidates();
  console.log("\n  ΜΕΡΗ:");
  for (const p of extraction.parties) {
    const m = matchParty({ name: p.name, vat: p.vat }, candidates);
    console.log(
      `   • ${p.name} — ΑΦΜ ${p.vat ?? "—"} → ${m ? `${m.side} (${m.method}, ${m.score})` : "ΔΕΝ ΤΑΙΡΙΑΞΕ"}`
    );
  }

  console.time("\nΚρίση");
  const profile = await buildComplianceProfile();
  const reasoning = await reasonAboutRoles(extraction, profile);
  console.timeEnd("\nΚρίση");

  console.log("\n  ΡΟΛΟΙ:");
  for (const r of reasoning.partyRoles) {
    console.log(`   • ${r.name}: ${r.role} — ${r.rationale ?? ""} [${r.gdprArticles.join(", ")}]`);
  }

  console.log("\n  ΚΕΝΑ:");
  for (const g of reasoning.gaps) {
    console.log(`   • [${g.severity}] ${g.title} → ${g.remedyType ?? "—"}`);
  }
  console.log();
  process.exit(0);
}

main().catch((e) => {
  console.error("\n✖", e);
  process.exit(1);
});
```

- [ ] **Step 2: Βάλε πραγματικά κλειδιά στο `.env`**

Χρειάζονται `GEMINI_API_KEY`, `GEMINI_MODEL_LITE`, `GEMINI_MODEL_PRO` (επιβεβαιωμένα από τα Google docs, βλ. Task 7 Step 6) και το υπάρχον `DEEPSEEK_API_KEY`.

- [ ] **Step 3: Τρέξε πέντε πραγματικές σκαναρισμένες συμβάσεις**

Run (μία φορά ανά αρχείο):
```bash
npx tsx scripts/intake-smoke.ts ./δείγματα/συμβαση1.pdf
```

Κατάγραψε σε πίνακα, ανά αρχείο: **ποιότητα OCR**, **κλιμάκωση ναι/όχι**, **σωστά ΑΦΜ / σύνολο**, **σωστοί ρόλοι / σύνολο**.

- [ ] **Step 4: Βαθμονόμησε το κατώφλι**

Αν κλιμακώνουν σχεδόν όλα τα έγγραφα, το `INTAKE_OCR_QUALITY_THRESHOLD` είναι πολύ υψηλό και το κόστος θα εκτοξευθεί. Αν δεν κλιμακώνει κανένα ενώ η εξαγωγή βγαίνει λάθος, είναι πολύ χαμηλό. Ρύθμισέ το ώστε να κλιμακώνουν **μόνο** τα έγγραφα που όντως διαβάστηκαν άσχημα, και γράψε την τιμή στο `.env`.

- [ ] **Step 5: Κριτήριο συνέχειας**

Προχώρα στο UI (Στάδιο 1β) μόνο αν, στα πέντε έγγραφα:
- **τα ΑΦΜ εξάγονται σωστά ≥ 80%** — είναι το κλειδί αντιστοίχισης· κάτω από αυτό, η αντιστοίχιση εταιριών δεν στέκει
- **οι ρόλοι προτείνονται σωστά ≥ 70%** — ο χρήστης διορθώνει, αλλά αν διορθώνει τα πάντα ο wizard δεν εξοικονομεί τίποτα

Αν πέσεις κάτω, το πρόβλημα είναι σχεδόν πάντα στο OCR, όχι στην κρίση: κοίτα πρώτα το `ocr.text` των αποτυχιών.

- [ ] **Step 6: Commit**

```bash
git add scripts/intake-smoke.ts
git commit -m "test(intake): end-to-end smoke script for real contracts"
```

---

## Έλεγχος πληρότητας

- [ ] **Όλα τα tests περνούν**

Run: `npx vitest run`
Expected: `Test Files 20 passed`, όλα τα tests πράσινα

- [ ] **Typecheck και build καθαρά**

Run: `npx tsc --noEmit && npm run build`
Expected: `✓ Compiled successfully`

- [ ] **Καμία νέα παράβαση lint**

Run: `npx eslint src/lib/intake src/lib/gemini.ts src/actions/intake.ts src/app/api/intake`
Expected: καμία γραμμή `error`
