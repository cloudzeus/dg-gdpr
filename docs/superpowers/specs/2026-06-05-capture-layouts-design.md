# Per-Project Capture Layouts + Signature — Design Spec

**Ημερομηνία:** 2026-06-05
**Project:** dg-gdpr (GDPR Compliance OS)

## Σκοπός

Εσωτερικό (authenticated) flow όπου ένας υπάλληλος καταγράφει συναίνεση πελάτη «δια ζώσης». Ο υπάλληλος επιλέγει project από κάρτες· κάθε project είναι συσχετισμένο με ένα **layout template** που καθορίζει τη ροή/αισθητική των οθονών. Το πρώτο πλήρες template (`WIZARD_SIGNATURE`, αισθητική «Kosmocar») είναι multi-step με **χειρόγραφη υπογραφή** πελάτη που αποθηκεύεται στο Bunny CDN.

Το δημόσιο self-service link (`/c/[slug]`) **δεν** επηρεάζεται.

## Αποφάσεις (από brainstorming)

| Θέμα | Απόφαση |
|------|---------|
| Τύπος flow | Εσωτερικό, για συνδεδεμένο υπάλληλο (χρήση υπάρχοντος app login) |
| Επιλογή project | Οθόνη με κάρτες· αν 1 ενεργό → auto-redirect |
| Συσχέτιση layout | Πεδίο `layoutTemplate` ανά `ConsentProject` |
| Branding | Σταθερό **ανά template** (όχι ανά project) |
| Πεδία φόρμας | **Δυναμικά** από τα Data Fields του project |
| Υπογραφή | Canvas → PNG → **Bunny CDN** |
| Ολοκλήρωση | Record **CONFIRMED** άμεσα **+ email** επιβεβαίωσης |
| Οργάνωση κώδικα | Κάθε template = **δικός του φάκελος** με δικό του CSS module (self-contained) |
| Πρόσβαση | Κάθε συνδεδεμένος χρήστης (gate από το `(app)` layout) |

## Αρχιτεκτονική

### 1. Routes (εσωτερικά, κάτω από `(app)`)

- **`/capture`** — project picker. Κάρτες των `ACTIVE` consent projects. Αν υπάρχει ακριβώς **1** ενεργό → `redirect` σε `/capture/<slug>`.
- **`/capture/[slug]`** — server component· φορτώνει project + fields + purposes, διαλέγει `CAPTURE_TEMPLATES[project.layoutTemplate] ?? DEFAULT` και το renders με props.

### 2. Δεδομένα (Prisma — εφαρμογή με `db push`, ΟΧΙ `migrate dev`)

```prisma
// ConsentProject
layoutTemplate String @default("DEFAULT")

// ConsentRecord
signatureUrl  String? @db.Text
capturedById  String?

// enum ConfirmationMethod  → προσθήκη τιμής
IN_PERSON
```

`capturedById` αποθηκεύεται ως scalar (User.id) χωρίς formal relation, για να μην αλλάξει το `User` model.

### 3. Template registry & types

```
src/components/capture/
├─ templates/
│  ├─ index.ts        # CAPTURE_TEMPLATES: Record<string, CaptureTemplate>
│  ├─ types.ts        # CaptureTemplateProps, FieldDef, PurposeDef
│  ├─ default/
│  │  ├─ default-capture.tsx
│  │  └─ default.module.css
│  └─ wizard-signature/
│     ├─ wizard-signature.tsx
│     ├─ wizard-signature.module.css
│     └─ signature-pad.tsx
```

`types.ts`:
```ts
export interface FieldDef { key: string; label: string; inputType: string; required: boolean }
export interface PurposeDef { id: string; label: string; description: string; required: boolean }
export interface CaptureProjectInfo { slug: string; name: string; description: string }
export interface CaptureTemplateProps {
  project: CaptureProjectInfo;
  fields: FieldDef[];
  purposes: PurposeDef[];
}
export type CaptureTemplate = (props: CaptureTemplateProps) => React.JSX.Element;
```

`index.ts` maps `"DEFAULT" → DefaultCapture`, `"WIZARD_SIGNATURE" → WizardSignature`. Νέο template = νέος φάκελος + 1 εγγραφή εδώ. Κάθε φάκελος είναι self-contained με δικό του CSS module (καμία διαρροή στυλ προς το υπόλοιπο Fluent UI).

### 4. Template `WIZARD_SIGNATURE` (client)

Αισθητική «Kosmocar» (πράσινο `#00a650`, Apple-style), portαρισμένη σε `wizard-signature.module.css` (scoped). Responsive (tablet/desktop/mobile, χωρίς horizontal scroll).

State machine 4 βημάτων:
1. **Στοιχεία Πελάτη** — render των δυναμικών `fields`. Email/τηλέφωνο αντλούνται από πεδία τύπου `EMAIL`/`PHONE` (όπως στη δημόσια φόρμα).
2. **Συναίνεση** — checkboxes από `purposes`.
3. **Υπογραφή** — `signature-pad.tsx`: canvas (port του JS από `04-signature.html` σε React· mouse + touch, clear, «signed» state). Export PNG dataURL.
4. **Επιβεβαίωση** — success + αριθμός αναφοράς (record id).

Step indicator + sticky footer (Πίσω / Συνέχεια / Υποβολή). Το κουμπί Υποβολή ενεργό μόνο όταν υπάρχει υπογραφή.

`DEFAULT` template: απλό εσωτερικό single-page capture (δυναμικά πεδία + σκοποί, **χωρίς** υπογραφή) ώστε το registry να αναλύεται πάντα.

### 5. Υποβολή — `src/actions/capture.ts`

```ts
captureConsent(input: {
  slug: string;
  values: Record<string, string>;
  purposeConsents: Record<string, boolean>;
  subjectEmail: string;
  subjectPhone?: string;
  signatureDataUrl?: string;   // "data:image/png;base64,..."
}): Promise<{ recordId: string }>
```

Βήματα:
1. `requireUser()` → `capturedById = session.user.id`.
2. Εύρεση project by slug (πρέπει `ACTIVE`).
3. Αν υπάρχει `signatureDataUrl`: `dataUrlToBuffer()` → `uploadToBunny(buffer, "signatures/<cuid>.png", "image/png")` → `signatureUrl`.
4. `prisma.consentRecord.create`: `status=CONFIRMED`, `confirmedAt=now`, `verifyToken` (generate), `ipAddress` (από `headers()` μέσω `getClientIp`), `confirmationChannel="IN_PERSON"`, `signatureUrl`, `capturedById`, `values`, `purposeConsents`, `subjectEmail`, `subjectPhone`, `locale`.
5. Αποστολή `consentConfirmedEmail` στο `subjectEmail` (το ήδη redesigned template).
6. `logAction({ action: "CAPTURE", entity: "ConsentRecord", entityId })`.
7. `return { recordId }`.

`src/lib/data-url.ts`:
```ts
export function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; contentType: string }
```
Parse `data:<mime>;base64,<payload>`. Πετάει σφάλμα σε άκυρη μορφή. **Unit-tested** (`data-url.test.ts`).

### 6. Σύνδεση project ↔ template (admin)

- Επέκταση `updateConsentProject` input με `layoutTemplate?: string`.
- Στο project editor (`consent/projects/[id]/project-editor.tsx`): νέο select **«Layout οθονών»** (DEFAULT / WIZARD_SIGNATURE) που καλεί `updateConsentProject`.

### 7. Sidebar / πρόσβαση

- Νέο item στην ομάδα «Συναινέσεις»: **«Λήψη Συναίνεσης»** → `/capture` (icon υπογραφής). Ορατό σε όλους τους συνδεδεμένους.

## Επηρεαζόμενα αρχεία

**Νέα**
- `src/app/(app)/capture/page.tsx` (project picker)
- `src/app/(app)/capture/[slug]/page.tsx` (template host)
- `src/components/capture/templates/index.ts`
- `src/components/capture/templates/types.ts`
- `src/components/capture/templates/default/default-capture.tsx` + `default.module.css`
- `src/components/capture/templates/wizard-signature/wizard-signature.tsx` + `wizard-signature.module.css` + `signature-pad.tsx`
- `src/actions/capture.ts`
- `src/lib/data-url.ts` + `src/lib/data-url.test.ts`

**Τροποποίηση**
- `prisma/schema.prisma` (layoutTemplate, signatureUrl, capturedById, IN_PERSON)
- `src/actions/consent.ts` (`updateConsentProject` + `layoutTemplate`)
- `src/app/(app)/consent/projects/[id]/project-editor.tsx` (select)
- `src/components/layout/sidebar.tsx` (link)

## Σημεία ασφάλειας / σχεδιασμού

- `captureConsent` φυλάσσεται με `requireUser()` (μόνο συνδεδεμένοι υπάλληλοι).
- Η υπογραφή είναι νομική απόδειξη· αποθηκεύεται μαζί με IP/ώρα/υπάλληλο. Record γίνεται CONFIRMED άμεσα.
- Το `signatureDataUrl` γίνεται validate (μόνο `image/png`) πριν το upload· cap μεγέθους (π.χ. 2MB).
- Τα CSS modules κρατούν την «Kosmocar» αισθητική scoped — δεν επηρεάζεται το υπόλοιπο app.

## Εκτός σκοπού (YAGNI)

- Πλήρως config-driven θέματα ανά project (νέο look = νέο template σε κώδικα).
- Ξεχωριστή οθόνη login υπαλλήλου.
- Brand-logos strip ανά πελάτη (μέρος του σταθερού template look).
- Προβολή/εξαγωγή της εικόνας υπογραφής στα admin records (μπορεί να προστεθεί αργότερα· το `signatureUrl` αποθηκεύεται ήδη).
