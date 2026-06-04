# Consent Management Platform (CMP) — Design Spec

**Date:** 2026-06-04
**Status:** Approved (design), pending implementation plan
**Module name:** Consent (Συναινέσεις)

## 1. Summary

A new section that lets the organisation:

1. Maintain a **global library of personal-data fields**, each with multilingual (EL/EN)
   label & description, a DeepSeek-translated description, and a DeepSeek-suggested GDPR
   legal basis (Art. 6).
2. Create **Consent Projects** (consent-collection campaigns) with a slug, multilingual
   name/description, a selection of personal-data fields, multiple multilingual
   **processing purposes**, and a consent-confirmation method (email / sms / both).
3. Collect **consent records** per project through a public, double-opt-in form. Each
   confirmation captures IP, timestamp and user-agent as legal proof of consent.
4. Auto-generate, from the slug, public **self-service URLs** for the data subject to
   withdraw consent (erasure) and to export their own data (portability).
5. Expose each project's consent list both as **JSON via an API-key-protected web service**
   and as an **Excel export** from the admin UI.

This is a Consent Management Platform (CMP) module. It is built as one cohesive module.

## 2. Key decisions (locked)

| Decision | Choice |
|---|---|
| New model naming (avoids collision with existing `Project`) | `ConsentProject` |
| SMS provider | Email double-opt-in now; SMS behind an abstraction interface (stub) for later |
| Translation languages | EL + EN, stored as JSON `{ el, en }`, re-translate on demand via DeepSeek |
| Consent flow | Double opt-in (submit → PENDING → click email link → CONFIRMED with IP/time proof) |
| Field GDPR info from AI | Suggested **legal basis** (Art. 6) only; `isSpecialCategory` is a manual flag |
| Consent granularity | Per-purpose (granular) consent |
| Public erasure/portability identity check | Email/SMS verify link |
| JSON web-service auth | Existing `ApiKey` model + `validateApiKey` + CORS |
| Multilingual storage | JSON columns `{ el, en }` (Approach A — consistent with existing JSON-column pattern) |
| Public "delete" action | Sets `ConsentRecord.status = WITHDRAWN` **and** creates a `DataSubjectRequest` (so it enters the existing admin workflow) |

## 3. Architecture context (existing patterns to follow)

- **Next.js 16**, Prisma/MySQL, Auth.js v5. Server Components for data fetching.
- **DeepSeek**: today called inline per route via `fetch("https://api.deepseek.com/chat/completions")`
  with `process.env.DEEPSEEK_API_KEY`, model `deepseek-chat`. This spec extracts a shared
  `src/lib/deepseek.ts` wrapper and uses it.
- **Email**: Mailgun via `src/lib/mail.ts` (`sendMail`). New templates go in `src/lib/consent-email.ts`.
- **Excel**: `exceljs` via `src/lib/export-excel.ts` pattern. New builder in `src/lib/consent-excel.ts`.
- **Public API**: `src/app/api/public/gdpr/**` routes use `validateApiKey` + `corsHeaders`
  from `src/lib/api-key.ts`, with an `OPTIONS` handler. New consent endpoints follow this.
- **Admin pages** live under `src/app/(app)/<module>/`. New public pages go under a new
  `src/app/(public)/c/` route group (no auth).

## 4. Data model (Prisma)

JSON multilingual fields use the shape `{ "el": string, "en": string }` (`LocalizedText`).

### 4.1 `PersonalDataField` — global field library (admin-curated)

| Field | Type | Notes |
|---|---|---|
| `id` | String @id cuid | |
| `key` | String @unique | slug, e.g. `email`, `afm` |
| `label` | Json | `{ el, en }` |
| `description` | Json | `{ el, en }` — DeepSeek-translatable |
| `category` | enum `DataFieldCategory` | IDENTITY, CONTACT, FINANCIAL, HEALTH, ONLINE, OTHER |
| `isSpecialCategory` | Boolean @default(false) | Art. 9 — **manual** |
| `suggestedLegalBasis` | Json? | DeepSeek-generated: list of `{ basis, rationale: {el,en} }` per Art. 6 |
| `inputType` | enum `FieldInputType` | TEXT, EMAIL, PHONE, DATE, NUMBER, TEXTAREA — drives the public form render |
| `createdAt/updatedAt` | DateTime | |

### 4.2 `ConsentProject` — the campaign

| Field | Type | Notes |
|---|---|---|
| `id` | String @id cuid | |
| `name` | String | internal/admin name |
| `slug` | String @unique | drives all public URLs |
| `description` | Json | `{ el, en }` |
| `status` | enum `ConsentProjectStatus` | DRAFT, ACTIVE, ARCHIVED |
| `confirmationMethod` | enum `ConfirmationMethod` | EMAIL, SMS, BOTH |
| `createdAt/updatedAt` | DateTime | |

Relations: `fields ConsentProjectField[]`, `purposes ConsentPurpose[]`, `records ConsentRecord[]`.

### 4.3 `ConsentProjectField` — M:N join (project ↔ field)

| Field | Type | Notes |
|---|---|---|
| `id` | String @id cuid | |
| `projectId` | String | FK → ConsentProject (onDelete Cascade) |
| `fieldId` | String | FK → PersonalDataField |
| `required` | Boolean @default(true) | |
| `order` | Int @default(0) | |
| | | `@@unique([projectId, fieldId])` |

### 4.4 `ConsentPurpose` — processing purposes (multiple per project)

| Field | Type | Notes |
|---|---|---|
| `id` | String @id cuid | |
| `projectId` | String | FK → ConsentProject (onDelete Cascade) |
| `label` | Json | `{ el, en }` |
| `description` | Json | `{ el, en }` |
| `legalBasis` | enum `LegalBasis` | Art. 6 basis |
| `required` | Boolean @default(false) | if true, cannot be declined |
| `order` | Int @default(0) | |

### 4.5 `ConsentRecord` — collected consent

| Field | Type | Notes |
|---|---|---|
| `id` | String @id cuid | |
| `projectId` | String | FK → ConsentProject |
| `subjectEmail` | String | |
| `subjectPhone` | String? | |
| `values` | Json | field values submitted by the subject `{ fieldKey: value }` |
| `purposeConsents` | Json | granular: `{ purposeId: boolean }` |
| `status` | enum `ConsentStatus` | PENDING, CONFIRMED, WITHDRAWN |
| `verifyToken` | String @unique | secure random token for confirm + preference center |
| `confirmedAt` | DateTime? | set on confirm — proof |
| `ipAddress` | String? | captured at confirm — proof |
| `userAgent` | String? @db.Text | captured at confirm — proof |
| `confirmationChannel` | enum `ConfirmationMethod`? | EMAIL / SMS used |
| `locale` | String @default("el") | submission locale |
| `withdrawnAt` | DateTime? | |
| `createdAt/updatedAt` | DateTime | |
| | | `@@index([projectId])`, `@@index([subjectEmail])`, `@@index([status])` |

### 4.6 Enums

- `DataFieldCategory { IDENTITY, CONTACT, FINANCIAL, HEALTH, ONLINE, OTHER }`
- `FieldInputType { TEXT, EMAIL, PHONE, DATE, NUMBER, TEXTAREA }`
- `ConsentProjectStatus { DRAFT, ACTIVE, ARCHIVED }`
- `ConfirmationMethod { EMAIL, SMS, BOTH }`
- `ConsentStatus { PENDING, CONFIRMED, WITHDRAWN }`
- `LegalBasis { CONSENT, CONTRACT, LEGAL_OBLIGATION, VITAL_INTEREST, PUBLIC_TASK, LEGITIMATE_INTEREST }`

## 5. Flows

### 5.1 Double opt-in consent collection
1. Subject opens `/c/[slug]`, fills the field values + ticks per-purpose checkboxes.
2. `submitConsent` creates `ConsentRecord` (status PENDING) with a `verifyToken`, sends a
   verification email (Mailgun) containing `/c/[slug]/confirm/[token]`.
3. Subject clicks the link → `confirmConsent` records `confirmedAt`, `ipAddress`,
   `userAgent`, sets status CONFIRMED. **This is the legal proof of consent.**

### 5.2 Preference center (erasure / portability)
1. Subject opens `/c/[slug]/manage`, enters email → `requestPreferenceAccess` sends a verify link.
2. Subject clicks `/c/[slug]/manage/[token]`:
   - **Withdraw**: `withdrawConsent` → status WITHDRAWN + creates `DataSubjectRequest`.
   - **Export**: `exportSubjectData` → JSON download of their own data (portability).

### 5.3 SMS abstraction
A `SmsSender` interface with a no-op/log stub implementation now. When `confirmationMethod`
is SMS/BOTH and no provider is configured, the system falls back to email and logs a warning.

## 6. Methods

### Server Actions — `src/actions/consent.ts` (admin, authenticated)
- `listPersonalDataFields`, `createPersonalDataField`, `updatePersonalDataField`, `deletePersonalDataField`
- `translateFieldText(text, targets)` → DeepSeek
- `generateFieldLegalBasis(field)` → DeepSeek
- `listConsentProjects`, `getConsentProject(slug)`, `createConsentProject`, `updateConsentProject`, `deleteConsentProject`
- `setProjectFields(projectId, fieldIds[])`
- `addPurpose`, `updatePurpose`, `deletePurpose`, `reorderPurposes`
- `translateProjectContent(projectId)` → DeepSeek bulk (name/description/purposes)
- `listConsentRecords(projectId, filters)`, `getConsentRecord(id)`, `adminWithdrawConsent(id)`

### Public logic — Route Handlers (no auth)
- `submitConsent(slug, payload)`
- `confirmConsent(token)`
- `requestPreferenceAccess(slug, email)`
- `withdrawConsent(token)`
- `exportSubjectData(token)`

### Helpers — `src/lib/`
- `consent-token.ts` — secure token gen/verify
- `deepseek.ts` — shared DeepSeek wrapper (extracted from inline route usage)
- `consent-excel.ts` — Excel export builder
- `consent-email.ts` — templates: verify, confirmed, preference-access
- `sms.ts` — `SmsSender` interface + stub implementation

## 7. Pages

### Admin — `src/app/(app)/consent/`
| Page | Path | Purpose |
|---|---|---|
| Data fields | `/consent/fields` | list + create/edit; "Translate" & "Suggest legal basis" (DeepSeek) buttons |
| Projects list | `/consent/projects` | all ConsentProjects, status, consent counts |
| Project edit | `/consent/projects/[id]` | multilingual name/slug/description, field selection, purposes, confirmationMethod, public URLs |
| Records | `/consent/projects/[id]/records` | consent list, filters, Excel export, proof view (IP/time) |

### Public — `src/app/(public)/c/` (no login)
| Page | Path |
|---|---|
| Consent form | `/c/[slug]` |
| Confirm (email link) | `/c/[slug]/confirm/[token]` |
| Preference center | `/c/[slug]/manage` |
| Post-verify actions | `/c/[slug]/manage/[token]` |

### Public API — `src/app/api/public/gdpr/consent/` (X-API-Key + CORS)
- `GET /consent/projects` — list projects
- `GET /consent/projects/[slug]/records` — JSON of all consents (web-service export)
- `POST /consent/[slug]/submit` — public, no key
- `GET /consent/confirm/[token]` — public, no key
- Update `src/app/api/public/openapi.json/route.ts` with the new endpoints.

### Navigation
New sidebar item "Συναινέσεις" (Consent) in the app layout, linking to Fields and Projects.

## 8. Error handling & edge cases
- Expired/invalid `verifyToken` → friendly public error page, offer to resend.
- Duplicate consent (same email + project, already CONFIRMED) → update existing record rather than duplicate.
- DeepSeek failure → return original text, surface a non-blocking error toast in admin.
- Slug uniqueness enforced; auto-suggest slug from name, editable while DRAFT only.
- Required purposes cannot be declined; form validation blocks submission.
- Excel/JSON export excludes nothing for admin; public portability export returns only that subject's own record.

## 9. Testing
- Unit: token gen/verify, slug generation, DeepSeek wrapper (mocked), Excel builder shape.
- Integration: submit → confirm flow sets proof fields; withdraw creates DataSubjectRequest;
  granular purposeConsents persisted correctly; API-key auth on JSON export.
- Manual: public form render per `inputType`; EL/EN toggle; preference-center verify link.

## 10. Out of scope (YAGNI)
- Real SMS provider integration (stub only).
- Languages beyond EL/EN.
- Versioning/history of consent text changes over time.
- Public API write endpoints for consent records (only read/export + public submit/confirm).
