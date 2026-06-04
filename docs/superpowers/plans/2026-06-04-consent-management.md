# Consent Management Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Consent Management module: a global personal-data-field library (multilingual + DeepSeek legal-basis), ConsentProject campaigns, granular double-opt-in consent collection with IP/time proof, a public preference center (withdraw/export), and JSON web-service + Excel exports.

**Architecture:** New Prisma models (`PersonalDataField`, `ConsentProject`, `ConsentProjectField`, `ConsentPurpose`, `ConsentRecord`) with multilingual JSON `{el,en}` columns. Admin work via Server Actions (`src/actions/consent.ts`); DeepSeek translate/legal-basis via authenticated API routes using a new shared `src/lib/deepseek.ts`. Public flow via no-auth Route Handlers + `(public)` page group. JSON export reuses the existing `ApiKey`/`validateApiKey`/`corsHeaders` infrastructure; Excel reuses `exceljs`.

**Tech Stack:** Next.js 16 (App Router), Prisma 5 / MySQL, Auth.js v5, zod 4, DeepSeek (`deepseek-chat`), Mailgun (`sendMail`), exceljs, vitest (new, for unit tests), shadcn/ui + Tailwind, react-icons/md.

**Spec:** `docs/superpowers/specs/2026-06-04-consent-management-design.md`

---

## File Structure

**New library/helpers**
- `src/lib/localized.ts` — `LocalizedText` type + `loc()` reader + `emptyLocalized()`
- `src/lib/deepseek.ts` — shared `deepseekChat()` + `deepseekJson()` wrapper
- `src/lib/consent-token.ts` — `generateConsentToken()`, `getClientIp()`
- `src/lib/slug.ts` — `slugify()`
- `src/lib/sms.ts` — `SmsSender` interface + `stubSmsSender` + `sendSms()`
- `src/lib/consent-email.ts` — verify / confirmed / preference-access templates
- `src/lib/consent-excel.ts` — `buildConsentExcel()`

**Domain logic / actions / routes**
- `src/actions/consent.ts` — admin Server Actions (CRUD + DeepSeek triggers)
- `src/app/api/ai/consent-translate/route.ts` — DeepSeek translate (authenticated)
- `src/app/api/ai/consent-legal-basis/route.ts` — DeepSeek legal-basis (authenticated)
- `src/app/api/public/consent/[slug]/submit/route.ts` — public submit (no auth)
- `src/app/api/public/consent/confirm/[token]/route.ts` — public confirm (no auth)
- `src/app/api/public/consent/manage/route.ts` — request preference access (no auth)
- `src/app/api/public/consent/manage/[token]/withdraw/route.ts` — withdraw (no auth)
- `src/app/api/public/consent/manage/[token]/export/route.ts` — portability JSON (no auth)
- `src/app/api/public/gdpr/consent/projects/route.ts` — list projects (X-API-Key)
- `src/app/api/public/gdpr/consent/projects/[slug]/records/route.ts` — records JSON (X-API-Key)
- `src/app/api/export/consent/[projectId]/route.ts` — Excel download (authenticated)

**Admin pages** (`src/app/(app)/consent/`)
- `fields/page.tsx`, `fields/fields-manager.tsx`
- `projects/page.tsx`
- `projects/[id]/page.tsx`, `projects/[id]/project-editor.tsx`
- `projects/[id]/records/page.tsx`

**Public pages** (`src/app/(public)/c/[slug]/`)
- `layout.tsx`, `page.tsx`, `consent-form.tsx`
- `confirm/[token]/page.tsx`
- `manage/page.tsx`, `manage/manage-request-form.tsx`
- `manage/[token]/page.tsx`, `manage/[token]/manage-actions.tsx`

**Modified**
- `prisma/schema.prisma` — new models/enums
- `prisma/seed.ts` — seed starter PersonalDataFields
- `src/components/layout/sidebar.tsx` — new nav group "Συναινέσεις"
- `src/app/api/public/openapi.json/route.ts` — document new endpoints
- `package.json` — vitest scripts + devDeps

---

## Phase 0 — Test setup

### Task 0: Add vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts + devDependencies)

- [ ] **Step 1: Install vitest**

Run:
```bash
cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npm i -D vitest@^2
```
Expected: adds `vitest` to devDependencies, exit 0.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 3: Add test scripts to `package.json`**

In the `"scripts"` block add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify vitest runs (no tests yet)**

Run: `npm test`
Expected: vitest reports "No test files found" (exit 0 or 1 — acceptable; the runner works).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest for unit tests"
```

---

## Phase 1 — Data model

### Task 1: Prisma schema — enums & models

**Files:**
- Modify: `prisma/schema.prisma` (append at end)

- [ ] **Step 1: Append the new enums and models**

Append to `prisma/schema.prisma`:
```prisma
// ─── Consent Management (CMP) ─────────────────────────────────────────────────

enum DataFieldCategory {
  IDENTITY
  CONTACT
  FINANCIAL
  HEALTH
  ONLINE
  OTHER
}

enum FieldInputType {
  TEXT
  EMAIL
  PHONE
  DATE
  NUMBER
  TEXTAREA
}

enum ConsentProjectStatus {
  DRAFT
  ACTIVE
  ARCHIVED
}

enum ConfirmationMethod {
  EMAIL
  SMS
  BOTH
}

enum ConsentStatus {
  PENDING
  CONFIRMED
  WITHDRAWN
}

enum LegalBasis {
  CONSENT
  CONTRACT
  LEGAL_OBLIGATION
  VITAL_INTEREST
  PUBLIC_TASK
  LEGITIMATE_INTEREST
}

model PersonalDataField {
  id                  String            @id @default(cuid())
  key                 String            @unique
  label               Json              // { el, en }
  description         Json              // { el, en }
  category            DataFieldCategory @default(OTHER)
  isSpecialCategory   Boolean           @default(false)
  suggestedLegalBasis Json?             // [{ basis, rationale: { el, en } }]
  inputType           FieldInputType    @default(TEXT)
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

  projectFields ConsentProjectField[]
}

model ConsentProject {
  id                 String               @id @default(cuid())
  name               String
  slug               String               @unique
  description        Json                 // { el, en }
  status             ConsentProjectStatus @default(DRAFT)
  confirmationMethod ConfirmationMethod   @default(EMAIL)
  createdAt          DateTime             @default(now())
  updatedAt          DateTime             @updatedAt

  fields   ConsentProjectField[]
  purposes ConsentPurpose[]
  records  ConsentRecord[]
}

model ConsentProjectField {
  id        String @id @default(cuid())
  projectId String
  fieldId   String
  required  Boolean @default(true)
  order     Int     @default(0)

  project ConsentProject    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  field   PersonalDataField @relation(fields: [fieldId], references: [id], onDelete: Cascade)

  @@unique([projectId, fieldId])
  @@index([projectId])
}

model ConsentPurpose {
  id          String     @id @default(cuid())
  projectId   String
  label       Json       // { el, en }
  description Json       // { el, en }
  legalBasis  LegalBasis @default(CONSENT)
  required    Boolean    @default(false)
  order       Int        @default(0)

  project ConsentProject @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
}

model ConsentRecord {
  id                  String              @id @default(cuid())
  projectId           String
  subjectEmail        String
  subjectPhone        String?
  values              Json                // { fieldKey: value }
  purposeConsents     Json                // { purposeId: boolean }
  status              ConsentStatus       @default(PENDING)
  verifyToken         String              @unique
  confirmedAt         DateTime?
  ipAddress           String?
  userAgent           String?             @db.Text
  confirmationChannel ConfirmationMethod?
  locale              String              @default("el")
  withdrawnAt         DateTime?
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt

  project ConsentProject @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@index([subjectEmail])
  @@index([status])
}
```

- [ ] **Step 2: Format & validate schema**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npx prisma validate`
Expected: "The schema at prisma/schema.prisma is valid 🚀"

- [ ] **Step 3: Create migration**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npx prisma migrate dev --name consent_management`
Expected: migration created and applied; Prisma Client regenerated. If the DB is unreachable, instead run `npx prisma generate` and note the migration must be applied later — but prefer the real migration.

- [ ] **Step 4: Verify client types exist**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npx tsc --noEmit -p tsconfig.json 2>&1 | head -20`
Expected: no errors referencing `ConsentProject`/`PersonalDataField` (types generated).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add consent management data model"
```

---

## Phase 2 — Pure-logic helpers (TDD)

### Task 2: Localized text helper

**Files:**
- Create: `src/lib/localized.ts`
- Test: `src/lib/localized.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { loc, emptyLocalized, type LocalizedText } from "@/lib/localized";

describe("loc", () => {
  const v: LocalizedText = { el: "Όνομα", en: "Name" };
  it("returns the requested locale", () => {
    expect(loc(v, "en")).toBe("Name");
    expect(loc(v, "el")).toBe("Όνομα");
  });
  it("falls back to el when requested locale is empty", () => {
    expect(loc({ el: "Όνομα", en: "" }, "en")).toBe("Όνομα");
  });
  it("handles null/undefined safely", () => {
    expect(loc(null, "el")).toBe("");
    expect(loc(undefined, "en")).toBe("");
  });
  it("accepts a JSON value (unknown) shape", () => {
    expect(loc({ el: "Α", en: "A" } as unknown, "en")).toBe("A");
  });
});

describe("emptyLocalized", () => {
  it("returns both keys empty", () => {
    expect(emptyLocalized()).toEqual({ el: "", en: "" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/localized.test.ts`
Expected: FAIL — cannot find module `@/lib/localized`.

- [ ] **Step 3: Implement**

```ts
export type Locale = "el" | "en";

export interface LocalizedText {
  el: string;
  en: string;
}

export function emptyLocalized(): LocalizedText {
  return { el: "", en: "" };
}

export function loc(value: unknown, locale: Locale): string {
  if (!value || typeof value !== "object") return "";
  const v = value as Partial<Record<Locale, unknown>>;
  const requested = typeof v[locale] === "string" ? (v[locale] as string) : "";
  if (requested.trim()) return requested;
  const el = typeof v.el === "string" ? (v.el as string) : "";
  return el;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/localized.test.ts`
Expected: PASS (5 assertions).

- [ ] **Step 5: Commit**

```bash
git add src/lib/localized.ts src/lib/localized.test.ts
git commit -m "feat: add localized text helper"
```

### Task 3: Slug helper

**Files:**
- Create: `src/lib/slug.ts`
- Test: `src/lib/slug.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates ASCII", () => {
    expect(slugify("My Consent Project")).toBe("my-consent-project");
  });
  it("transliterates Greek to ASCII", () => {
    expect(slugify("Καμπάνια Newsletter")).toBe("kampania-newsletter");
  });
  it("strips punctuation and collapses dashes", () => {
    expect(slugify("Hello!!  World??")).toBe("hello-world");
  });
  it("trims leading/trailing dashes", () => {
    expect(slugify("  -test-  ")).toBe("test");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/slug.test.ts`
Expected: FAIL — cannot find module `@/lib/slug`.

- [ ] **Step 3: Implement**

```ts
const GREEK_MAP: Record<string, string> = {
  α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "i", θ: "th",
  ι: "i", κ: "k", λ: "l", μ: "m", ν: "n", ξ: "x", ο: "o", π: "p",
  ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y", φ: "f", χ: "ch", ψ: "ps", ω: "o",
  ά: "a", έ: "e", ή: "i", ί: "i", ό: "o", ύ: "y", ώ: "o", ϊ: "i", ϋ: "y", ΐ: "i", ΰ: "y",
};

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .split("")
    .map((ch) => GREEK_MAP[ch] ?? ch)
    .join("")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/slug.test.ts`
Expected: PASS (4 assertions).

- [ ] **Step 5: Commit**

```bash
git add src/lib/slug.ts src/lib/slug.test.ts
git commit -m "feat: add slugify helper with Greek transliteration"
```

### Task 4: Consent token + client IP

**Files:**
- Create: `src/lib/consent-token.ts`
- Test: `src/lib/consent-token.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { generateConsentToken, getClientIp } from "@/lib/consent-token";

describe("generateConsentToken", () => {
  it("returns a 64-char hex string", () => {
    const t = generateConsentToken();
    expect(t).toMatch(/^[a-f0-9]{64}$/);
  });
  it("returns unique tokens", () => {
    expect(generateConsentToken()).not.toBe(generateConsentToken());
  });
});

describe("getClientIp", () => {
  it("reads the first x-forwarded-for entry", () => {
    const h = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientIp(h)).toBe("1.2.3.4");
  });
  it("falls back to x-real-ip", () => {
    const h = new Headers({ "x-real-ip": "9.9.9.9" });
    expect(getClientIp(h)).toBe("9.9.9.9");
  });
  it("returns 'unknown' when no headers present", () => {
    expect(getClientIp(new Headers())).toBe("unknown");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/consent-token.test.ts`
Expected: FAIL — cannot find module `@/lib/consent-token`.

- [ ] **Step 3: Implement**

```ts
import { randomBytes } from "crypto";

export function generateConsentToken(): string {
  return randomBytes(32).toString("hex");
}

export function getClientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/consent-token.test.ts`
Expected: PASS (5 assertions).

- [ ] **Step 5: Commit**

```bash
git add src/lib/consent-token.ts src/lib/consent-token.test.ts
git commit -m "feat: add consent token + client IP helpers"
```

### Task 5: DeepSeek wrapper

**Files:**
- Create: `src/lib/deepseek.ts`
- Test: `src/lib/deepseek.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { deepseekJson } from "@/lib/deepseek";

afterEach(() => vi.restoreAllMocks());

describe("deepseekJson", () => {
  it("parses JSON content stripped of markdown fences", async () => {
    process.env.DEEPSEEK_API_KEY = "test-key";
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: "```json\n{\"el\":\"Α\",\"en\":\"A\"}\n```" } }] }),
        { status: 200 },
      ) as Response,
    );
    const out = await deepseekJson<{ el: string; en: string }>({ system: "s", user: "u" });
    expect(out).toEqual({ el: "Α", en: "A" });
  });

  it("throws when DEEPSEEK_API_KEY is missing", async () => {
    delete process.env.DEEPSEEK_API_KEY;
    await expect(deepseekJson({ system: "s", user: "u" })).rejects.toThrow("DEEPSEEK_API_KEY");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/deepseek.test.ts`
Expected: FAIL — cannot find module `@/lib/deepseek`.

- [ ] **Step 3: Implement**

```ts
interface DeepseekParams {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}

export async function deepseekChat(params: DeepseekParams): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not configured");

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
      temperature: params.temperature ?? 0.3,
      max_tokens: params.maxTokens ?? 2048,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`DeepSeek ${res.status}: ${detail}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function deepseekJson<T = unknown>(params: DeepseekParams): Promise<T> {
  let content = await deepseekChat(params);
  content = content.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
  const start = content.indexOf("{");
  const startArr = content.indexOf("[");
  const begin = startArr !== -1 && (start === -1 || startArr < start) ? startArr : start;
  const endObj = content.lastIndexOf("}");
  const endArr = content.lastIndexOf("]");
  const end = Math.max(endObj, endArr);
  if (begin !== -1 && end !== -1) content = content.slice(begin, end + 1);
  return JSON.parse(content) as T;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/deepseek.test.ts`
Expected: PASS (2 assertions).

- [ ] **Step 5: Commit**

```bash
git add src/lib/deepseek.ts src/lib/deepseek.test.ts
git commit -m "feat: add shared DeepSeek wrapper"
```

---

## Phase 3 — Side-effect helpers (SMS, email, excel)

### Task 6: SMS abstraction (stub)

**Files:**
- Create: `src/lib/sms.ts`
- Test: `src/lib/sms.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from "vitest";
import { stubSmsSender } from "@/lib/sms";

describe("stubSmsSender", () => {
  it("logs and resolves null (no provider configured)", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await stubSmsSender.send("+306900000000", "hello");
    expect(res).toBeNull();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/sms.test.ts`
Expected: FAIL — cannot find module `@/lib/sms`.

- [ ] **Step 3: Implement**

```ts
export interface SmsSender {
  send(to: string, message: string): Promise<{ id: string } | null>;
}

// Stub implementation — replace with a real provider (Twilio, Greek SMS gateway) later.
export const stubSmsSender: SmsSender = {
  async send(to: string, message: string) {
    console.warn(`[sms] No SMS provider configured — skipping send to ${to}: ${message.slice(0, 40)}`);
    return null;
  },
};

export async function sendSms(to: string, message: string): Promise<{ id: string } | null> {
  return stubSmsSender.send(to, message);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/sms.test.ts`
Expected: PASS (1 assertion).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sms.ts src/lib/sms.test.ts
git commit -m "feat: add SMS sender abstraction with stub"
```

### Task 7: Consent email templates

**Files:**
- Create: `src/lib/consent-email.ts`
- Test: `src/lib/consent-email.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { consentVerifyEmail, consentConfirmedEmail, preferenceAccessEmail } from "@/lib/consent-email";

describe("consent email templates", () => {
  it("verify email includes the confirm URL and project name", () => {
    const { subject, html } = consentVerifyEmail({ projectName: "Newsletter", confirmUrl: "https://x/c/n/confirm/abc" });
    expect(subject).toContain("Newsletter");
    expect(html).toContain("https://x/c/n/confirm/abc");
  });
  it("preference access email includes the manage URL", () => {
    const { html } = preferenceAccessEmail({ projectName: "N", manageUrl: "https://x/c/n/manage/tok" });
    expect(html).toContain("https://x/c/n/manage/tok");
  });
  it("confirmed email returns subject + html", () => {
    const out = consentConfirmedEmail({ projectName: "N", confirmedAt: new Date("2026-06-04T10:00:00Z") });
    expect(out.subject).toBeTruthy();
    expect(out.html).toContain("N");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/consent-email.test.ts`
Expected: FAIL — cannot find module `@/lib/consent-email`.

- [ ] **Step 3: Implement**

```ts
function shell(title: string, bodyInner: string): string {
  return `<!doctype html>
<html><body style="font-family:Segoe UI,Arial,sans-serif;background:#f3f2f1;padding:24px;color:#201f1e">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #edebe9;border-radius:6px;overflow:hidden">
    <div style="background:#0078d4;color:#fff;padding:16px 20px;font-weight:600">GDPR Compliance OS</div>
    <div style="padding:20px">${bodyInner}</div>
    <div style="padding:10px 20px;border-top:1px solid #edebe9;color:#605e5c;font-size:11px">© DG Smart · GDPR Compliance OS</div>
  </div>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:20px 0"><a href="${href}" style="background:#0078d4;color:#fff;text-decoration:none;padding:10px 18px;border-radius:4px;display:inline-block">${label}</a></p>`;
}

export function consentVerifyEmail(p: { projectName: string; confirmUrl: string }) {
  const subject = `Επιβεβαίωση συναίνεσης — ${p.projectName}`;
  const html = shell(subject, `
    <p>Λάβαμε αίτημα καταχώρισης της συναίνεσής σας για <strong>${p.projectName}</strong>.</p>
    <p>Για να ολοκληρωθεί, επιβεβαιώστε πατώντας το παρακάτω κουμπί:</p>
    ${button(p.confirmUrl, "Επιβεβαίωση συναίνεσης")}
    <p style="color:#605e5c;font-size:12px">Αν δεν ζητήσατε εσείς αυτό, αγνοήστε το μήνυμα.</p>`);
  return { subject, html };
}

export function consentConfirmedEmail(p: { projectName: string; confirmedAt: Date }) {
  const date = p.confirmedAt.toLocaleString("el-GR");
  const subject = `Η συναίνεσή σας καταχωρίστηκε — ${p.projectName}`;
  const html = shell(subject, `
    <p>Η συναίνεσή σας για <strong>${p.projectName}</strong> καταχωρίστηκε στις ${date}.</p>
    <p style="color:#605e5c;font-size:12px">Μπορείτε ανά πάσα στιγμή να ανακαλέσετε τη συναίνεση ή να ζητήσετε αντίγραφο των δεδομένων σας από το κέντρο προτιμήσεων.</p>`);
  return { subject, html };
}

export function preferenceAccessEmail(p: { projectName: string; manageUrl: string }) {
  const subject = `Διαχείριση δεδομένων — ${p.projectName}`;
  const html = shell(subject, `
    <p>Ζητήσατε πρόσβαση στη διαχείριση των δεδομένων σας για <strong>${p.projectName}</strong>.</p>
    ${button(p.manageUrl, "Διαχείριση δεδομένων μου")}
    <p style="color:#605e5c;font-size:12px">Ο σύνδεσμος επιτρέπει ανάκληση συναίνεσης ή λήψη αντιγράφου των δεδομένων σας.</p>`);
  return { subject, html };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/consent-email.test.ts`
Expected: PASS (3 assertions).

- [ ] **Step 5: Commit**

```bash
git add src/lib/consent-email.ts src/lib/consent-email.test.ts
git commit -m "feat: add consent email templates"
```

### Task 8: Consent Excel builder

**Files:**
- Create: `src/lib/consent-excel.ts`
- Test: `src/lib/consent-excel.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildConsentExcel } from "@/lib/consent-excel";

describe("buildConsentExcel", () => {
  it("returns a non-empty xlsx buffer with a header row", async () => {
    const buf = await buildConsentExcel({
      projectName: "Newsletter",
      fieldKeys: ["email", "name"],
      purposeLabels: { p1: "Marketing" },
      records: [
        {
          id: "r1", subjectEmail: "a@b.gr", subjectPhone: null, status: "CONFIRMED",
          values: { email: "a@b.gr", name: "Άννα" }, purposeConsents: { p1: true },
          confirmedAt: new Date("2026-06-04T10:00:00Z"), ipAddress: "1.2.3.4",
          createdAt: new Date("2026-06-04T09:00:00Z"),
        },
      ],
    });
    expect(buf.byteLength).toBeGreaterThan(1000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/consent-excel.test.ts`
Expected: FAIL — cannot find module `@/lib/consent-excel`.

- [ ] **Step 3: Implement**

```ts
import ExcelJS from "exceljs";

export interface ConsentExcelRecord {
  id: string;
  subjectEmail: string;
  subjectPhone: string | null;
  status: string;
  values: Record<string, unknown>;
  purposeConsents: Record<string, boolean>;
  confirmedAt: Date | null;
  ipAddress: string | null;
  createdAt: Date;
}

export interface ConsentExcelInput {
  projectName: string;
  fieldKeys: string[];
  purposeLabels: Record<string, string>;
  records: ConsentExcelRecord[];
}

export async function buildConsentExcel(input: ConsentExcelInput): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Consents");

  const purposeIds = Object.keys(input.purposeLabels);
  const columns: Partial<ExcelJS.Column>[] = [
    { header: "ID", key: "id", width: 24 },
    { header: "Email", key: "subjectEmail", width: 28 },
    { header: "Τηλέφωνο", key: "subjectPhone", width: 16 },
    { header: "Κατάσταση", key: "status", width: 14 },
    ...input.fieldKeys.map((k) => ({ header: k, key: `field_${k}`, width: 22 })),
    ...purposeIds.map((id) => ({ header: input.purposeLabels[id], key: `purpose_${id}`, width: 18 })),
    { header: "Επιβεβαίωση", key: "confirmedAt", width: 20 },
    { header: "IP", key: "ipAddress", width: 16 },
    { header: "Δημιουργία", key: "createdAt", width: 20 },
  ];
  ws.columns = columns;

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0078D4" } } as ExcelJS.Fill;

  for (const r of input.records) {
    const row: Record<string, unknown> = {
      id: r.id,
      subjectEmail: r.subjectEmail,
      subjectPhone: r.subjectPhone ?? "",
      status: r.status,
      confirmedAt: r.confirmedAt ? r.confirmedAt.toLocaleString("el-GR") : "",
      ipAddress: r.ipAddress ?? "",
      createdAt: r.createdAt.toLocaleString("el-GR"),
    };
    for (const k of input.fieldKeys) row[`field_${k}`] = (r.values?.[k] as string) ?? "";
    for (const id of purposeIds) row[`purpose_${id}`] = r.purposeConsents?.[id] ? "ΝΑΙ" : "ΟΧΙ";
    ws.addRow(row);
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/consent-excel.test.ts`
Expected: PASS (1 assertion).

- [ ] **Step 5: Commit**

```bash
git add src/lib/consent-excel.ts src/lib/consent-excel.test.ts
git commit -m "feat: add consent Excel builder"
```

---

## Phase 4 — Admin Server Actions

### Task 9: Consent server actions

**Files:**
- Create: `src/actions/consent.ts`

> No unit test (DB + auth dependent). Verified via typecheck and later via the admin pages.

- [ ] **Step 1: Implement the server actions**

```ts
"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAction } from "@/lib/action-logger";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/slug";
import { generateConsentToken } from "@/lib/consent-token";
import type { LocalizedText } from "@/lib/localized";
import type {
  DataFieldCategory,
  FieldInputType,
  ConsentProjectStatus,
  ConfirmationMethod,
  LegalBasis,
} from "@prisma/client";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

// ── Personal Data Fields ───────────────────────────────────────────────

export async function listPersonalDataFields() {
  await requireUser();
  return prisma.personalDataField.findMany({ orderBy: { key: "asc" } });
}

export async function createPersonalDataField(input: {
  key: string;
  label: LocalizedText;
  description: LocalizedText;
  category: DataFieldCategory;
  isSpecialCategory: boolean;
  inputType: FieldInputType;
}) {
  await requireUser();
  const key = slugify(input.key);
  const created = await prisma.personalDataField.create({
    data: { ...input, key },
  });
  await logAction({ action: "CREATE", entity: "PersonalDataField", entityId: created.id });
  revalidatePath("/consent/fields");
  return created;
}

export async function updatePersonalDataField(
  id: string,
  input: Partial<{
    label: LocalizedText;
    description: LocalizedText;
    category: DataFieldCategory;
    isSpecialCategory: boolean;
    inputType: FieldInputType;
    suggestedLegalBasis: unknown;
  }>,
) {
  await requireUser();
  const updated = await prisma.personalDataField.update({ where: { id }, data: input as never });
  await logAction({ action: "UPDATE", entity: "PersonalDataField", entityId: id });
  revalidatePath("/consent/fields");
  return updated;
}

export async function deletePersonalDataField(id: string) {
  await requireUser();
  await prisma.personalDataField.delete({ where: { id } });
  await logAction({ action: "DELETE", entity: "PersonalDataField", entityId: id });
  revalidatePath("/consent/fields");
}

// ── Consent Projects ───────────────────────────────────────────────────

export async function listConsentProjects() {
  await requireUser();
  return prisma.consentProject.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { records: true, fields: true, purposes: true } } },
  });
}

export async function getConsentProjectById(id: string) {
  await requireUser();
  return prisma.consentProject.findUnique({
    where: { id },
    include: {
      fields: { include: { field: true }, orderBy: { order: "asc" } },
      purposes: { orderBy: { order: "asc" } },
    },
  });
}

export async function createConsentProject(input: {
  name: string;
  description: LocalizedText;
  confirmationMethod: ConfirmationMethod;
}) {
  const userId = await requireUser();
  let base = slugify(input.name) || "project";
  let slug = base;
  let i = 1;
  while (await prisma.consentProject.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  const created = await prisma.consentProject.create({
    data: { name: input.name, description: input.description, confirmationMethod: input.confirmationMethod, slug },
  });
  await logAction({ action: "CREATE", entity: "ConsentProject", entityId: created.id });
  revalidatePath("/consent/projects");
  return created;
}

export async function updateConsentProject(
  id: string,
  input: Partial<{
    name: string;
    description: LocalizedText;
    status: ConsentProjectStatus;
    confirmationMethod: ConfirmationMethod;
  }>,
) {
  await requireUser();
  const updated = await prisma.consentProject.update({ where: { id }, data: input as never });
  await logAction({ action: "UPDATE", entity: "ConsentProject", entityId: id });
  revalidatePath("/consent/projects");
  revalidatePath(`/consent/projects/${id}`);
  return updated;
}

export async function deleteConsentProject(id: string) {
  await requireUser();
  await prisma.consentProject.delete({ where: { id } });
  await logAction({ action: "DELETE", entity: "ConsentProject", entityId: id });
  revalidatePath("/consent/projects");
}

export async function setProjectFields(projectId: string, fieldIds: string[]) {
  await requireUser();
  await prisma.consentProjectField.deleteMany({ where: { projectId } });
  await prisma.consentProjectField.createMany({
    data: fieldIds.map((fieldId, idx) => ({ projectId, fieldId, order: idx })),
  });
  await logAction({ action: "UPDATE", entity: "ConsentProjectFields", entityId: projectId });
  revalidatePath(`/consent/projects/${projectId}`);
}

// ── Purposes ───────────────────────────────────────────────────────────

export async function addPurpose(projectId: string, input: {
  label: LocalizedText;
  description: LocalizedText;
  legalBasis: LegalBasis;
  required: boolean;
}) {
  await requireUser();
  const count = await prisma.consentPurpose.count({ where: { projectId } });
  const created = await prisma.consentPurpose.create({
    data: { projectId, ...input, order: count },
  });
  revalidatePath(`/consent/projects/${projectId}`);
  return created;
}

export async function updatePurpose(id: string, input: Partial<{
  label: LocalizedText;
  description: LocalizedText;
  legalBasis: LegalBasis;
  required: boolean;
}>) {
  await requireUser();
  const updated = await prisma.consentPurpose.update({ where: { id }, data: input as never });
  revalidatePath(`/consent/projects/${updated.projectId}`);
  return updated;
}

export async function deletePurpose(id: string) {
  await requireUser();
  const purpose = await prisma.consentPurpose.delete({ where: { id } });
  revalidatePath(`/consent/projects/${purpose.projectId}`);
}

// ── Records ────────────────────────────────────────────────────────────

export async function listConsentRecords(projectId: string, status?: "PENDING" | "CONFIRMED" | "WITHDRAWN") {
  await requireUser();
  return prisma.consentRecord.findMany({
    where: { projectId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
  });
}

export async function adminWithdrawConsent(id: string) {
  await requireUser();
  const updated = await prisma.consentRecord.update({
    where: { id },
    data: { status: "WITHDRAWN", withdrawnAt: new Date() },
  });
  await logAction({ action: "WITHDRAW", entity: "ConsentRecord", entityId: id });
  revalidatePath(`/consent/projects/${updated.projectId}/records`);
  return updated;
}

// Re-export for the public submit route (token generated server-side)
export { generateConsentToken };
```

- [ ] **Step 2: Typecheck**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npx tsc --noEmit 2>&1 | grep -i "consent" | head`
Expected: no errors referencing `src/actions/consent.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/actions/consent.ts
git commit -m "feat: add consent admin server actions"
```

---

## Phase 5 — DeepSeek API routes (admin, authenticated)

### Task 10: Translate route

**Files:**
- Create: `src/app/api/ai/consent-translate/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deepseekJson } from "@/lib/deepseek";

// POST { text: string, from?: "el"|"en", to: "el"|"en" } → { translated: string }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, from, to } = await req.json();
  if (!text?.trim() || !to) {
    return NextResponse.json({ error: "text and to are required" }, { status: 400 });
  }

  const langName = (l: string) => (l === "en" ? "Αγγλικά" : "Ελληνικά");
  try {
    const out = await deepseekJson<{ translated: string }>({
      system:
        "Είσαι επαγγελματίας μεταφραστής νομικών/GDPR κειμένων. Επιστρέφεις ΜΟΝΟ JSON της μορφής {\"translated\":\"...\"} χωρίς επεξηγήσεις.",
      user: `Μετάφρασε το παρακάτω κείμενο ${from ? `από ${langName(from)} ` : ""}στα ${langName(to)}. Διατήρησε νομική ορολογία.\n\nΚείμενο:\n${text}`,
      temperature: 0.2,
    });
    return NextResponse.json({ translated: out.translated ?? "" });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npx tsc --noEmit 2>&1 | grep "consent-translate" | head`
Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/ai/consent-translate/route.ts
git commit -m "feat: add DeepSeek consent translate route"
```

### Task 11: Legal-basis route

**Files:**
- Create: `src/app/api/ai/consent-legal-basis/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deepseekJson } from "@/lib/deepseek";

// POST { fieldKey, labelEl, descriptionEl, isSpecialCategory }
// → { suggestions: [{ basis, rationale: { el, en } }] }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fieldKey, labelEl, descriptionEl, isSpecialCategory } = await req.json();
  if (!labelEl?.trim()) return NextResponse.json({ error: "labelEl is required" }, { status: 400 });

  try {
    const out = await deepseekJson<{ suggestions: Array<{ basis: string; rationale: { el: string; en: string } }> }>({
      system:
        "Είσαι νομικός σύμβουλος GDPR. Επιστρέφεις ΜΟΝΟ JSON: {\"suggestions\":[{\"basis\":\"CONSENT|CONTRACT|LEGAL_OBLIGATION|VITAL_INTEREST|PUBLIC_TASK|LEGITIMATE_INTEREST\",\"rationale\":{\"el\":\"...\",\"en\":\"...\"}}]}. Χωρίς markdown, χωρίς επεξηγήσεις εκτός του JSON.",
      user: `Πεδίο προσωπικών δεδομένων: "${labelEl}" (key: ${fieldKey}).\nΠεριγραφή: ${descriptionEl ?? "—"}.\nΕιδική κατηγορία (Άρθρο 9): ${isSpecialCategory ? "ΝΑΙ" : "ΟΧΙ"}.\nΠρότεινε 1-3 πιθανές νομικές βάσεις επεξεργασίας κατά το Άρθρο 6 GDPR, με σύντομη αιτιολόγηση σε EL και EN.`,
      temperature: 0.3,
      maxTokens: 1024,
    });
    return NextResponse.json({ suggestions: out.suggestions ?? [] });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npx tsc --noEmit 2>&1 | grep "consent-legal-basis" | head`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/ai/consent-legal-basis/route.ts
git commit -m "feat: add DeepSeek legal-basis suggestion route"
```

---

## Phase 6 — Public submit/confirm/manage Route Handlers

### Task 12: Public submit route

**Files:**
- Create: `src/app/api/public/consent/[slug]/submit/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateConsentToken } from "@/lib/consent-token";
import { sendMail } from "@/lib/mail";
import { sendSms } from "@/lib/sms";
import { consentVerifyEmail } from "@/lib/consent-email";

function baseUrl(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
}

// POST { subjectEmail, subjectPhone?, values, purposeConsents, locale? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await prisma.consentProject.findUnique({
    where: { slug },
    include: { purposes: true, fields: { include: { field: true } } },
  });
  if (!project || project.status !== "ACTIVE") {
    return NextResponse.json({ error: "Project not found or inactive" }, { status: 404 });
  }

  let body: { subjectEmail?: string; subjectPhone?: string; values?: Record<string, unknown>; purposeConsents?: Record<string, boolean>; locale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.subjectEmail?.trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Valid subjectEmail required" }, { status: 400 });
  }

  // Required-purpose validation
  const purposeConsents = body.purposeConsents ?? {};
  for (const p of project.purposes) {
    if (p.required && purposeConsents[p.id] !== true) {
      return NextResponse.json({ error: `Purpose ${p.id} is required` }, { status: 400 });
    }
  }
  // Required-field validation
  const values = body.values ?? {};
  for (const pf of project.fields) {
    if (pf.required && !String(values[pf.field.key] ?? "").trim()) {
      return NextResponse.json({ error: `Field ${pf.field.key} is required` }, { status: 400 });
    }
  }

  const verifyToken = generateConsentToken();
  // Upsert: if a record for this email already exists, refresh it back to PENDING with a new token.
  const existing = await prisma.consentRecord.findFirst({ where: { projectId: project.id, subjectEmail: email } });
  const record = existing
    ? await prisma.consentRecord.update({
        where: { id: existing.id },
        data: { subjectPhone: body.subjectPhone ?? null, values: values as never, purposeConsents: purposeConsents as never, status: "PENDING", verifyToken, confirmedAt: null, withdrawnAt: null, locale: body.locale ?? "el" },
      })
    : await prisma.consentRecord.create({
        data: { projectId: project.id, subjectEmail: email, subjectPhone: body.subjectPhone ?? null, values: values as never, purposeConsents: purposeConsents as never, verifyToken, locale: body.locale ?? "el" },
      });

  const confirmUrl = `${baseUrl(req)}/c/${slug}/confirm/${verifyToken}`;
  const mail = consentVerifyEmail({ projectName: project.name, confirmUrl });
  await sendMail({ to: email, subject: mail.subject, html: mail.html });
  if ((project.confirmationMethod === "SMS" || project.confirmationMethod === "BOTH") && body.subjectPhone) {
    await sendSms(body.subjectPhone, `Επιβεβαιώστε τη συναίνεσή σας: ${confirmUrl}`);
  }

  return NextResponse.json({ ok: true, recordId: record.id }, { status: 201 });
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npx tsc --noEmit 2>&1 | grep "consent/\[slug\]/submit" | head`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/public/consent
git commit -m "feat: add public consent submit route"
```

### Task 13: Confirm route (records proof)

**Files:**
- Create: `src/app/api/public/consent/confirm/[token]/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/consent-token";
import { sendMail } from "@/lib/mail";
import { consentConfirmedEmail } from "@/lib/consent-email";

// GET — clicked from the verification email. Redirects to a friendly confirm page.
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const record = await prisma.consentRecord.findUnique({ where: { verifyToken: token }, include: { project: true } });
  if (!record) {
    return NextResponse.redirect(new URL(`/c/unknown/confirm/invalid`, req.url));
  }

  if (record.status === "PENDING") {
    const confirmedAt = new Date();
    await prisma.consentRecord.update({
      where: { id: record.id },
      data: {
        status: "CONFIRMED",
        confirmedAt,
        ipAddress: getClientIp(req.headers),
        userAgent: req.headers.get("user-agent") ?? null,
        confirmationChannel: "EMAIL",
      },
    });
    const mail = consentConfirmedEmail({ projectName: record.project.name, confirmedAt });
    await sendMail({ to: record.subjectEmail, subject: mail.subject, html: mail.html });
  }

  return NextResponse.redirect(new URL(`/c/${record.project.slug}/confirm/${token}`, req.url));
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npx tsc --noEmit 2>&1 | grep "confirm/\[token\]" | head`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/public/consent/confirm
git commit -m "feat: add consent confirm route with IP/time proof"
```

### Task 14: Preference-access request route

**Files:**
- Create: `src/app/api/public/consent/manage/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { sendSms } from "@/lib/sms";
import { preferenceAccessEmail } from "@/lib/consent-email";

function baseUrl(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
}

// POST { slug, email } → always 200 (no account enumeration). Sends a manage link if a record exists.
export async function POST(req: NextRequest) {
  let body: { slug?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const slug = body.slug?.trim();
  const email = body.email?.trim();
  if (!slug || !email) return NextResponse.json({ error: "slug and email required" }, { status: 400 });

  const project = await prisma.consentProject.findUnique({ where: { slug } });
  if (project) {
    const record = await prisma.consentRecord.findFirst({
      where: { projectId: project.id, subjectEmail: email, status: { in: ["CONFIRMED", "PENDING"] } },
    });
    if (record) {
      const manageUrl = `${baseUrl(req)}/c/${slug}/manage/${record.verifyToken}`;
      const mail = preferenceAccessEmail({ projectName: project.name, manageUrl });
      await sendMail({ to: email, subject: mail.subject, html: mail.html });
      if ((project.confirmationMethod === "SMS" || project.confirmationMethod === "BOTH") && record.subjectPhone) {
        await sendSms(record.subjectPhone, `Διαχείριση δεδομένων: ${manageUrl}`);
      }
    }
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npx tsc --noEmit 2>&1 | grep "consent/manage/route" | head`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/public/consent/manage/route.ts
git commit -m "feat: add preference-access request route"
```

### Task 15: Withdraw + export routes

**Files:**
- Create: `src/app/api/public/consent/manage/[token]/withdraw/route.ts`
- Create: `src/app/api/public/consent/manage/[token]/export/route.ts`

- [ ] **Step 1: Implement withdraw route**

`src/app/api/public/consent/manage/[token]/withdraw/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST — withdraw consent + create a DataSubjectRequest so it enters the admin workflow.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const record = await prisma.consentRecord.findUnique({ where: { verifyToken: token }, include: { project: true } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (record.status !== "WITHDRAWN") {
    await prisma.consentRecord.update({
      where: { id: record.id },
      data: { status: "WITHDRAWN", withdrawnAt: new Date() },
    });
    await prisma.dataSubjectRequest.create({
      data: {
        type: "WITHDRAW_CONSENT",
        subjectName: record.subjectEmail,
        subjectEmail: record.subjectEmail,
        subjectPhone: record.subjectPhone,
        description: `Ανάκληση συναίνεσης από το consent project "${record.project.name}" (slug: ${record.project.slug}).`,
      },
    });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Implement export route**

`src/app/api/public/consent/manage/[token]/export/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — portability: download the subject's own data as JSON.
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const record = await prisma.consentRecord.findUnique({ where: { verifyToken: token }, include: { project: { include: { purposes: true } } } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const payload = {
    project: { name: record.project.name, slug: record.project.slug },
    subject: { email: record.subjectEmail, phone: record.subjectPhone },
    values: record.values,
    purposeConsents: record.purposeConsents,
    status: record.status,
    confirmedAt: record.confirmedAt,
    withdrawnAt: record.withdrawnAt,
    createdAt: record.createdAt,
  };
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="my-data-${record.project.slug}.json"`,
    },
  });
}
```

- [ ] **Step 3: Typecheck**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npx tsc --noEmit 2>&1 | grep "manage/\[token\]" | head`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/public/consent/manage
git commit -m "feat: add withdraw + portability export routes"
```

---

## Phase 7 — Public API (X-API-Key) + Excel export

### Task 16: JSON web-service routes

**Files:**
- Create: `src/app/api/public/gdpr/consent/projects/route.ts`
- Create: `src/app/api/public/gdpr/consent/projects/[slug]/records/route.ts`

- [ ] **Step 1: Implement projects list route**

`src/app/api/public/gdpr/consent/projects/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey, corsHeaders } from "@/lib/api-key";

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: await corsHeaders(req) });
}

export async function GET(req: NextRequest) {
  const cors = await corsHeaders(req);
  const apiKey = await validateApiKey(req);
  if (!apiKey) return NextResponse.json({ error: "Invalid or missing API key. Pass X-API-Key header." }, { status: 401, headers: cors });

  const projects = await prisma.consentProject.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { records: true } } },
  });
  return NextResponse.json({
    count: projects.length,
    projects: projects.map((p) => ({
      slug: p.slug,
      name: p.name,
      description: p.description,
      status: p.status,
      confirmationMethod: p.confirmationMethod,
      consentCount: p._count.records,
      createdAt: p.createdAt.toISOString(),
    })),
  }, { headers: cors });
}
```

- [ ] **Step 2: Implement records route**

`src/app/api/public/gdpr/consent/projects/[slug]/records/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey, corsHeaders } from "@/lib/api-key";

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: await corsHeaders(req) });
}

// GET /consent/projects/[slug]/records?status=CONFIRMED — JSON of all consents for the project.
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const cors = await corsHeaders(req);
  const apiKey = await validateApiKey(req);
  if (!apiKey) return NextResponse.json({ error: "Invalid or missing API key. Pass X-API-Key header." }, { status: 401, headers: cors });

  const { slug } = await params;
  const project = await prisma.consentProject.findUnique({ where: { slug } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404, headers: cors });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as "PENDING" | "CONFIRMED" | "WITHDRAWN" | null;

  const records = await prisma.consentRecord.findMany({
    where: { projectId: project.id, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    project: { slug: project.slug, name: project.name },
    count: records.length,
    records: records.map((r) => ({
      id: r.id,
      subjectEmail: r.subjectEmail,
      subjectPhone: r.subjectPhone,
      values: r.values,
      purposeConsents: r.purposeConsents,
      status: r.status,
      confirmedAt: r.confirmedAt?.toISOString() ?? null,
      ipAddress: r.ipAddress,
      withdrawnAt: r.withdrawnAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  }, { headers: cors });
}
```

- [ ] **Step 3: Typecheck**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npx tsc --noEmit 2>&1 | grep "gdpr/consent" | head`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/public/gdpr/consent
git commit -m "feat: add consent JSON web-service endpoints"
```

### Task 17: Excel export route

**Files:**
- Create: `src/app/api/export/consent/[projectId]/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildConsentExcel } from "@/lib/consent-excel";
import { loc } from "@/lib/localized";

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const project = await prisma.consentProject.findUnique({
    where: { id: projectId },
    include: { fields: { include: { field: true }, orderBy: { order: "asc" } }, purposes: { orderBy: { order: "asc" } } },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const records = await prisma.consentRecord.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } });

  const purposeLabels: Record<string, string> = {};
  for (const p of project.purposes) purposeLabels[p.id] = loc(p.label, "el");

  const buffer = await buildConsentExcel({
    projectName: project.name,
    fieldKeys: project.fields.map((f) => f.field.key),
    purposeLabels,
    records: records.map((r) => ({
      id: r.id,
      subjectEmail: r.subjectEmail,
      subjectPhone: r.subjectPhone,
      status: r.status,
      values: r.values as Record<string, unknown>,
      purposeConsents: r.purposeConsents as Record<string, boolean>,
      confirmedAt: r.confirmedAt,
      ipAddress: r.ipAddress,
      createdAt: r.createdAt,
    })),
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="consents-${project.slug}.xlsx"`,
    },
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npx tsc --noEmit 2>&1 | grep "export/consent" | head`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/export/consent
git commit -m "feat: add consent Excel export route"
```

---

## Phase 8 — Admin pages

> These follow the existing `(app)` pattern: Server Component `page.tsx` fetches data and renders a client component. Verify each with `npm run build`.

### Task 18: Data fields admin page

**Files:**
- Create: `src/app/(app)/consent/fields/page.tsx`
- Create: `src/app/(app)/consent/fields/fields-manager.tsx`

- [ ] **Step 1: Implement the server page**

`src/app/(app)/consent/fields/page.tsx`:
```tsx
import { listPersonalDataFields } from "@/actions/consent";
import { FieldsManager } from "./fields-manager";

export default async function ConsentFieldsPage() {
  const fields = await listPersonalDataFields();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-1">Πεδία Προσωπικών Δεδομένων</h1>
      <p className="text-sm text-gray-500 mb-6">Βιβλιοθήκη πεδίων με πολυγλωσσικές περιγραφές και προτεινόμενη νομική βάση (GDPR).</p>
      <FieldsManager initialFields={JSON.parse(JSON.stringify(fields))} />
    </div>
  );
}
```

- [ ] **Step 2: Implement the client manager**

`src/app/(app)/consent/fields/fields-manager.tsx`:
```tsx
"use client";

import { useState } from "react";
import {
  createPersonalDataField,
  updatePersonalDataField,
  deletePersonalDataField,
} from "@/actions/consent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { loc, type LocalizedText } from "@/lib/localized";

interface FieldRow {
  id: string;
  key: string;
  label: LocalizedText;
  description: LocalizedText;
  category: string;
  isSpecialCategory: boolean;
  inputType: string;
  suggestedLegalBasis: unknown;
}

const CATEGORIES = ["IDENTITY", "CONTACT", "FINANCIAL", "HEALTH", "ONLINE", "OTHER"];
const INPUT_TYPES = ["TEXT", "EMAIL", "PHONE", "DATE", "NUMBER", "TEXTAREA"];

export function FieldsManager({ initialFields }: { initialFields: FieldRow[] }) {
  const [fields, setFields] = useState<FieldRow[]>(initialFields);
  const [draft, setDraft] = useState({
    key: "", labelEl: "", labelEn: "", descEl: "", descEn: "",
    category: "OTHER", inputType: "TEXT", isSpecialCategory: false,
  });
  const [busy, setBusy] = useState(false);

  async function translate(text: string, to: "el" | "en"): Promise<string> {
    const res = await fetch("/api/ai/consent-translate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, to }),
    });
    if (!res.ok) return "";
    return (await res.json()).translated ?? "";
  }

  async function suggestBasis(id: string, f: FieldRow) {
    const res = await fetch("/api/ai/consent-legal-basis", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fieldKey: f.key, labelEl: loc(f.label, "el"), descriptionEl: loc(f.description, "el"), isSpecialCategory: f.isSpecialCategory }),
    });
    if (!res.ok) { alert("Αποτυχία πρότασης νομικής βάσης"); return; }
    const { suggestions } = await res.json();
    await updatePersonalDataField(id, { suggestedLegalBasis: suggestions });
    setFields((prev) => prev.map((x) => (x.id === id ? { ...x, suggestedLegalBasis: suggestions } : x)));
  }

  async function add() {
    setBusy(true);
    try {
      const created = await createPersonalDataField({
        key: draft.key,
        label: { el: draft.labelEl, en: draft.labelEn },
        description: { el: draft.descEl, en: draft.descEn },
        category: draft.category as never,
        isSpecialCategory: draft.isSpecialCategory,
        inputType: draft.inputType as never,
      });
      setFields((prev) => [...prev, created as unknown as FieldRow]);
      setDraft({ key: "", labelEl: "", labelEn: "", descEl: "", descEn: "", category: "OTHER", inputType: "TEXT", isSpecialCategory: false });
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm("Διαγραφή πεδίου;")) return;
    await deletePersonalDataField(id);
    setFields((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-4 space-y-3 bg-white">
        <h2 className="font-medium">Νέο πεδίο</h2>
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="key (π.χ. email)" value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })} />
          <div className="flex gap-2">
            <select className="border rounded px-2 text-sm" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="border rounded px-2 text-sm" value={draft.inputType} onChange={(e) => setDraft({ ...draft, inputType: e.target.value })}>
              {INPUT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <Input placeholder="Ετικέτα (EL)" value={draft.labelEl} onChange={(e) => setDraft({ ...draft, labelEl: e.target.value })} />
          <div className="flex gap-2">
            <Input placeholder="Label (EN)" value={draft.labelEn} onChange={(e) => setDraft({ ...draft, labelEn: e.target.value })} />
            <Button type="button" variant="outline" disabled={busy || !draft.labelEl} onClick={async () => {
              setBusy(true);
              try { const t = await translate(draft.labelEl, "en"); setDraft((d) => ({ ...d, labelEn: t })); }
              finally { setBusy(false); }
            }}>EL→EN</Button>
          </div>
          <Textarea placeholder="Περιγραφή (EL)" value={draft.descEl} onChange={(e) => setDraft({ ...draft, descEl: e.target.value })} />
          <div className="space-y-2">
            <Textarea placeholder="Description (EN)" value={draft.descEn} onChange={(e) => setDraft({ ...draft, descEn: e.target.value })} />
            <Button type="button" variant="outline" size="sm" disabled={busy || !draft.descEl} onClick={async () => {
              setBusy(true);
              try { const t = await translate(draft.descEl, "en"); setDraft((d) => ({ ...d, descEn: t })); }
              finally { setBusy(false); }
            }}>Μετάφραση EL→EN</Button>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.isSpecialCategory} onChange={(e) => setDraft({ ...draft, isSpecialCategory: e.target.checked })} />
          Ειδική κατηγορία (Άρθρο 9)
        </label>
        <Button onClick={add} disabled={busy || !draft.key || !draft.labelEl}>Προσθήκη πεδίου</Button>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr><th className="p-2">Key</th><th className="p-2">Ετικέτα</th><th className="p-2">Κατηγορία</th><th className="p-2">Άρθ.9</th><th className="p-2">Νομική βάση</th><th className="p-2"></th></tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.id} className="border-t">
                <td className="p-2 font-mono">{f.key}</td>
                <td className="p-2">{loc(f.label, "el")}</td>
                <td className="p-2">{f.category}</td>
                <td className="p-2">{f.isSpecialCategory ? "✔" : "—"}</td>
                <td className="p-2">{Array.isArray(f.suggestedLegalBasis) && f.suggestedLegalBasis.length ? (f.suggestedLegalBasis as Array<{ basis: string }>).map((s) => s.basis).join(", ") : "—"}</td>
                <td className="p-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => suggestBasis(f.id, f)}>Πρόταση βάσης</Button>
                  <Button size="sm" variant="outline" onClick={() => remove(f.id)}>Διαγραφή</Button>
                </td>
              </tr>
            ))}
            {fields.length === 0 && <tr><td className="p-4 text-gray-400" colSpan={6}>Δεν υπάρχουν πεδία ακόμη.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

> NOTE for the implementing engineer: the EL→EN buttons call the `translate()` helper defined in this file. Confirm `Button` supports `size`/`variant` props by checking `src/components/ui/button.tsx`; if not, drop those props and use `className`.

- [ ] **Step 3: Build**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npm run build 2>&1 | tail -20`
Expected: build succeeds; `/consent/fields` appears in the route list.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/consent/fields"
git commit -m "feat: add consent data-fields admin page"
```

### Task 19: Projects list page

**Files:**
- Create: `src/app/(app)/consent/projects/page.tsx`

- [ ] **Step 1: Implement**

```tsx
import Link from "next/link";
import { listConsentProjects, createConsentProject } from "@/actions/consent";
import { Button } from "@/components/ui/button";
import { loc } from "@/lib/localized";
import { formatDate } from "@/lib/utils";

export default async function ConsentProjectsPage() {
  const projects = await listConsentProjects();

  async function create(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;
    await createConsentProject({ name, description: { el: "", en: "" }, confirmationMethod: "EMAIL" });
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-1">Consent Projects</h1>
      <p className="text-sm text-gray-500 mb-6">Καμπάνιες συλλογής συναινέσεων.</p>

      <form action={create} className="flex gap-2 mb-6">
        <input name="name" placeholder="Όνομα νέου project" className="border rounded px-3 py-2 text-sm flex-1 max-w-sm" />
        <Button type="submit">Δημιουργία</Button>
      </form>

      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr><th className="p-2">Όνομα</th><th className="p-2">Slug</th><th className="p-2">Κατάσταση</th><th className="p-2">Πεδία</th><th className="p-2">Σκοποί</th><th className="p-2">Συναινέσεις</th><th className="p-2">Δημιουργία</th></tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="p-2"><Link href={`/consent/projects/${p.id}`} className="text-blue-600 hover:underline">{p.name}</Link></td>
                <td className="p-2 font-mono">{p.slug}</td>
                <td className="p-2">{p.status}</td>
                <td className="p-2">{p._count.fields}</td>
                <td className="p-2">{p._count.purposes}</td>
                <td className="p-2">{p._count.records}</td>
                <td className="p-2">{formatDate(p.createdAt)}</td>
              </tr>
            ))}
            {projects.length === 0 && <tr><td className="p-4 text-gray-400" colSpan={7}>Δεν υπάρχουν projects ακόμη.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npm run build 2>&1 | tail -20`
Expected: build succeeds; `/consent/projects` in route list.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/consent/projects/page.tsx"
git commit -m "feat: add consent projects list page"
```

### Task 20: Project editor page

**Files:**
- Create: `src/app/(app)/consent/projects/[id]/page.tsx`
- Create: `src/app/(app)/consent/projects/[id]/project-editor.tsx`

- [ ] **Step 1: Implement the server page**

`src/app/(app)/consent/projects/[id]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { getConsentProjectById, listPersonalDataFields } from "@/actions/consent";
import { ProjectEditor } from "./project-editor";

export default async function ConsentProjectEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project, allFields] = await Promise.all([getConsentProjectById(id), listPersonalDataFields()]);
  if (!project) notFound();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        <Link href={`/consent/projects/${id}/records`} className="text-blue-600 hover:underline text-sm">Συναινέσεις →</Link>
      </div>
      <ProjectEditor
        project={JSON.parse(JSON.stringify(project))}
        allFields={JSON.parse(JSON.stringify(allFields))}
      />
    </div>
  );
}
```

- [ ] **Step 2: Implement the client editor**

`src/app/(app)/consent/projects/[id]/project-editor.tsx`:
```tsx
"use client";

import { useState } from "react";
import {
  updateConsentProject, setProjectFields, addPurpose, deletePurpose,
} from "@/actions/consent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { loc, type LocalizedText } from "@/lib/localized";

interface ProjectData {
  id: string; name: string; slug: string; description: LocalizedText;
  status: string; confirmationMethod: string;
  fields: { fieldId: string; field: { id: string; key: string; label: LocalizedText } }[];
  purposes: { id: string; label: LocalizedText; description: LocalizedText; legalBasis: string; required: boolean }[];
}
interface FieldOption { id: string; key: string; label: LocalizedText }

const STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"];
const METHODS = ["EMAIL", "SMS", "BOTH"];
const BASES = ["CONSENT", "CONTRACT", "LEGAL_OBLIGATION", "VITAL_INTEREST", "PUBLIC_TASK", "LEGITIMATE_INTEREST"];

export function ProjectEditor({ project, allFields }: { project: ProjectData; allFields: FieldOption[] }) {
  const [name, setName] = useState(project.name);
  const [descEl, setDescEl] = useState(project.description?.el ?? "");
  const [descEn, setDescEn] = useState(project.description?.en ?? "");
  const [status, setStatus] = useState(project.status);
  const [method, setMethod] = useState(project.confirmationMethod);
  const [selected, setSelected] = useState<string[]>(project.fields.map((f) => f.fieldId));
  const [purposes, setPurposes] = useState(project.purposes);
  const [purposeDraft, setPurposeDraft] = useState({ labelEl: "", labelEn: "", descEl: "", descEn: "", legalBasis: "CONSENT", required: false });

  const publicBase = typeof window !== "undefined" ? window.location.origin : "";

  async function saveDetails() {
    await updateConsentProject(project.id, {
      name, description: { el: descEl, en: descEn }, status: status as never, confirmationMethod: method as never,
    });
    alert("Αποθηκεύτηκε");
  }
  async function toggleField(id: string) {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    setSelected(next);
    await setProjectFields(project.id, next);
  }
  async function addP() {
    const created = await addPurpose(project.id, {
      label: { el: purposeDraft.labelEl, en: purposeDraft.labelEn },
      description: { el: purposeDraft.descEl, en: purposeDraft.descEn },
      legalBasis: purposeDraft.legalBasis as never, required: purposeDraft.required,
    });
    setPurposes((p) => [...p, created as never]);
    setPurposeDraft({ labelEl: "", labelEn: "", descEl: "", descEn: "", legalBasis: "CONSENT", required: false });
  }
  async function removeP(id: string) {
    await deletePurpose(id);
    setPurposes((p) => p.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <section className="border rounded-lg p-4 bg-white space-y-3">
        <h2 className="font-medium">Στοιχεία</h2>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Όνομα" />
        <div className="grid grid-cols-2 gap-3">
          <Textarea value={descEl} onChange={(e) => setDescEl(e.target.value)} placeholder="Περιγραφή (EL)" />
          <Textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} placeholder="Description (EN)" />
        </div>
        <div className="flex gap-3">
          <select className="border rounded px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
          <select className="border rounded px-2 text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select>
          <Button onClick={saveDetails}>Αποθήκευση</Button>
        </div>
        <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
          <p>Δημόσια φόρμα: <code>{publicBase}/c/{project.slug}</code></p>
          <p>Κέντρο προτιμήσεων: <code>{publicBase}/c/{project.slug}/manage</code></p>
        </div>
      </section>

      <section className="border rounded-lg p-4 bg-white">
        <h2 className="font-medium mb-3">Πεδία δεδομένων</h2>
        <div className="grid grid-cols-2 gap-2">
          {allFields.map((f) => (
            <label key={f.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selected.includes(f.id)} onChange={() => toggleField(f.id)} />
              {loc(f.label, "el")} <span className="text-gray-400 font-mono text-xs">{f.key}</span>
            </label>
          ))}
          {allFields.length === 0 && <p className="text-gray-400 text-sm">Δημιουργήστε πρώτα πεδία στη βιβλιοθήκη.</p>}
        </div>
      </section>

      <section className="border rounded-lg p-4 bg-white space-y-3">
        <h2 className="font-medium">Λόγοι / Σκοποί χρήσης</h2>
        {purposes.map((p) => (
          <div key={p.id} className="flex items-center justify-between border-t pt-2 text-sm">
            <div><strong>{loc(p.label, "el")}</strong> <span className="text-gray-400">({p.legalBasis}{p.required ? ", υποχρεωτικός" : ""})</span></div>
            <Button size="sm" variant="outline" onClick={() => removeP(p.id)}>Διαγραφή</Button>
          </div>
        ))}
        <div className="border-t pt-3 grid grid-cols-2 gap-2">
          <Input placeholder="Σκοπός (EL)" value={purposeDraft.labelEl} onChange={(e) => setPurposeDraft({ ...purposeDraft, labelEl: e.target.value })} />
          <Input placeholder="Purpose (EN)" value={purposeDraft.labelEn} onChange={(e) => setPurposeDraft({ ...purposeDraft, labelEn: e.target.value })} />
          <Textarea placeholder="Περιγραφή (EL)" value={purposeDraft.descEl} onChange={(e) => setPurposeDraft({ ...purposeDraft, descEl: e.target.value })} />
          <Textarea placeholder="Description (EN)" value={purposeDraft.descEn} onChange={(e) => setPurposeDraft({ ...purposeDraft, descEn: e.target.value })} />
          <select className="border rounded px-2 text-sm" value={purposeDraft.legalBasis} onChange={(e) => setPurposeDraft({ ...purposeDraft, legalBasis: e.target.value })}>{BASES.map((b) => <option key={b}>{b}</option>)}</select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={purposeDraft.required} onChange={(e) => setPurposeDraft({ ...purposeDraft, required: e.target.checked })} /> Υποχρεωτικός</label>
          <Button onClick={addP} disabled={!purposeDraft.labelEl}>Προσθήκη σκοπού</Button>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Build**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npm run build 2>&1 | tail -20`
Expected: build succeeds; `/consent/projects/[id]` in route list.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/consent/projects/[id]/page.tsx" "src/app/(app)/consent/projects/[id]/project-editor.tsx"
git commit -m "feat: add consent project editor page"
```

### Task 21: Records page (with Excel link)

**Files:**
- Create: `src/app/(app)/consent/projects/[id]/records/page.tsx`

- [ ] **Step 1: Implement**

```tsx
import { notFound } from "next/navigation";
import { getConsentProjectById, listConsentRecords } from "@/actions/consent";
import { formatDateTime } from "@/lib/utils";

export default async function ConsentRecordsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getConsentProjectById(id);
  if (!project) notFound();
  const records = await listConsentRecords(id);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Συναινέσεις — {project.name}</h1>
        <a href={`/api/export/consent/${id}`} className="bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700">Εξαγωγή Excel</a>
      </div>
      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr><th className="p-2">Email</th><th className="p-2">Κατάσταση</th><th className="p-2">Επιβεβαίωση</th><th className="p-2">IP</th><th className="p-2">User-Agent</th></tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.subjectEmail}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2">{formatDateTime(r.confirmedAt)}</td>
                <td className="p-2 font-mono">{r.ipAddress ?? "—"}</td>
                <td className="p-2 max-w-xs truncate text-gray-500">{r.userAgent ?? "—"}</td>
              </tr>
            ))}
            {records.length === 0 && <tr><td className="p-4 text-gray-400" colSpan={5}>Καμία συναίνεση ακόμη.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npm run build 2>&1 | tail -20`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/consent/projects/[id]/records/page.tsx"
git commit -m "feat: add consent records page with Excel export"
```

---

## Phase 9 — Public pages

### Task 22: Public layout + consent form page

**Files:**
- Create: `src/app/(public)/c/[slug]/layout.tsx`
- Create: `src/app/(public)/c/[slug]/page.tsx`
- Create: `src/app/(public)/c/[slug]/consent-form.tsx`

- [ ] **Step 1: Implement the public layout**

`src/app/(public)/c/[slug]/layout.tsx`:
```tsx
export default function PublicConsentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-lg">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Implement the consent form page (server)**

`src/app/(public)/c/[slug]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loc } from "@/lib/localized";
import { ConsentForm } from "./consent-form";

export default async function PublicConsentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await prisma.consentProject.findUnique({
    where: { slug },
    include: { fields: { include: { field: true }, orderBy: { order: "asc" } }, purposes: { orderBy: { order: "asc" } } },
  });
  if (!project || project.status !== "ACTIVE") notFound();

  const fields = project.fields.map((pf) => ({
    key: pf.field.key,
    label: loc(pf.field.label, "el"),
    inputType: pf.field.inputType,
    required: pf.required,
  }));
  const purposes = project.purposes.map((p) => ({
    id: p.id, label: loc(p.label, "el"), description: loc(p.description, "el"), required: p.required,
  }));

  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h1 className="text-xl font-semibold mb-1">{project.name}</h1>
      <p className="text-sm text-gray-500 mb-6">{loc(project.description, "el")}</p>
      <ConsentForm slug={slug} fields={fields} purposes={purposes} />
    </div>
  );
}
```

- [ ] **Step 3: Implement the form (client)**

`src/app/(public)/c/[slug]/consent-form.tsx`:
```tsx
"use client";

import { useState } from "react";

interface FieldDef { key: string; label: string; inputType: string; required: boolean }
interface PurposeDef { id: string; label: string; description: string; required: boolean }

const HTML_TYPE: Record<string, string> = { TEXT: "text", EMAIL: "email", PHONE: "tel", DATE: "date", NUMBER: "number" };

export function ConsentForm({ slug, fields, purposes }: { slug: string; fields: FieldDef[]; purposes: PurposeDef[] }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/public/consent/${slug}/submit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectEmail: email, subjectPhone: phone || undefined, values, purposeConsents: consents, locale: "el" }),
      });
      if (!res.ok) { setError((await res.json()).error ?? "Σφάλμα"); return; }
      setDone(true);
    } finally { setBusy(false); }
  }

  if (done) return <div className="text-center py-8"><p className="text-green-600 font-medium">Ευχαριστούμε!</p><p className="text-sm text-gray-500 mt-2">Σας στείλαμε email επιβεβαίωσης. Πατήστε τον σύνδεσμο για να ολοκληρωθεί η συναίνεση.</p></div>;

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Email *</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Τηλέφωνο</label>
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
      </div>
      {fields.map((f) => (
        <div key={f.key}>
          <label className="block text-sm font-medium mb-1">{f.label}{f.required ? " *" : ""}</label>
          {f.inputType === "TEXTAREA" ? (
            <textarea required={f.required} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
          ) : (
            <input type={HTML_TYPE[f.inputType] ?? "text"} required={f.required} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
          )}
        </div>
      ))}
      <div className="space-y-2 border-t pt-4">
        <p className="text-sm font-medium">Σκοποί επεξεργασίας</p>
        {purposes.map((p) => (
          <label key={p.id} className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={consents[p.id] ?? false} onChange={(e) => setConsents({ ...consents, [p.id]: e.target.checked })} />
            <span><strong>{p.label}{p.required ? " *" : ""}</strong><br /><span className="text-gray-500">{p.description}</span></span>
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">Υποβολή συναίνεσης</button>
    </form>
  );
}
```

- [ ] **Step 4: Build**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npm run build 2>&1 | tail -20`
Expected: build succeeds; `/c/[slug]` in route list.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(public)/c/[slug]/layout.tsx" "src/app/(public)/c/[slug]/page.tsx" "src/app/(public)/c/[slug]/consent-form.tsx"
git commit -m "feat: add public consent form page"
```

### Task 23: Confirm result page

**Files:**
- Create: `src/app/(public)/c/[slug]/confirm/[token]/page.tsx`

- [ ] **Step 1: Implement**

```tsx
import { prisma } from "@/lib/prisma";

export default async function ConfirmResultPage({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { token } = await params;
  const record = await prisma.consentRecord.findUnique({ where: { verifyToken: token } });
  const ok = record?.status === "CONFIRMED";

  return (
    <div className="bg-white border rounded-lg p-8 shadow-sm text-center">
      {ok ? (
        <>
          <p className="text-green-600 text-lg font-semibold">Η συναίνεσή σας επιβεβαιώθηκε ✔</p>
          <p className="text-sm text-gray-500 mt-2">Καταγράφηκε με ασφάλεια η ημερομηνία, η ώρα και η IP σας ως απόδειξη συναίνεσης.</p>
        </>
      ) : (
        <>
          <p className="text-red-600 text-lg font-semibold">Μη έγκυρος ή ληγμένος σύνδεσμος</p>
          <p className="text-sm text-gray-500 mt-2">Υποβάλετε ξανά τη φόρμα συναίνεσης για να λάβετε νέο σύνδεσμο.</p>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npm run build 2>&1 | tail -20`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(public)/c/[slug]/confirm"
git commit -m "feat: add consent confirm result page"
```

### Task 24: Preference center pages

**Files:**
- Create: `src/app/(public)/c/[slug]/manage/page.tsx`
- Create: `src/app/(public)/c/[slug]/manage/manage-request-form.tsx`
- Create: `src/app/(public)/c/[slug]/manage/[token]/page.tsx`
- Create: `src/app/(public)/c/[slug]/manage/[token]/manage-actions.tsx`

- [ ] **Step 1: Implement the request page + form**

`src/app/(public)/c/[slug]/manage/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ManageRequestForm } from "./manage-request-form";

export default async function ManageRequestPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await prisma.consentProject.findUnique({ where: { slug } });
  if (!project) notFound();
  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h1 className="text-xl font-semibold mb-1">Διαχείριση δεδομένων — {project.name}</h1>
      <p className="text-sm text-gray-500 mb-6">Εισάγετε το email σας. Θα λάβετε σύνδεσμο για ανάκληση συναίνεσης ή λήψη των δεδομένων σας.</p>
      <ManageRequestForm slug={slug} />
    </div>
  );
}
```

`src/app/(public)/c/[slug]/manage/manage-request-form.tsx`:
```tsx
"use client";
import { useState } from "react";

export function ManageRequestForm({ slug }: { slug: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch(`/api/public/consent/manage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, email }),
      });
      setSent(true);
    } finally { setBusy(false); }
  }

  if (sent) return <p className="text-sm text-green-600">Αν υπάρχει εγγραφή με αυτό το email, σας στείλαμε σύνδεσμο διαχείρισης.</p>;

  return (
    <form onSubmit={submit} className="space-y-3">
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full border rounded px-3 py-2 text-sm" />
      <button type="submit" disabled={busy} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">Αποστολή συνδέσμου</button>
    </form>
  );
}
```

- [ ] **Step 2: Implement the token actions page + client**

`src/app/(public)/c/[slug]/manage/[token]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ManageActions } from "./manage-actions";

export default async function ManageActionsPage({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  const record = await prisma.consentRecord.findUnique({ where: { verifyToken: token }, include: { project: true } });
  if (!record || record.project.slug !== slug) notFound();

  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h1 className="text-xl font-semibold mb-1">Τα δεδομένα μου — {record.project.name}</h1>
      <p className="text-sm text-gray-500 mb-2">Email: {record.subjectEmail}</p>
      <p className="text-sm text-gray-500 mb-6">Κατάσταση: <strong>{record.status}</strong></p>
      <ManageActions slug={slug} token={token} withdrawn={record.status === "WITHDRAWN"} />
    </div>
  );
}
```

`src/app/(public)/c/[slug]/manage/[token]/manage-actions.tsx`:
```tsx
"use client";
import { useState } from "react";

export function ManageActions({ slug, token, withdrawn }: { slug: string; token: string; withdrawn: boolean }) {
  const [isWithdrawn, setIsWithdrawn] = useState(withdrawn);
  const [busy, setBusy] = useState(false);

  async function withdraw() {
    if (!confirm("Ανάκληση της συναίνεσής σας;")) return;
    setBusy(true);
    try {
      await fetch(`/api/public/consent/manage/${token}/withdraw`, { method: "POST" });
      setIsWithdrawn(true);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <a href={`/api/public/consent/manage/${token}/export`} className="block w-full text-center border border-blue-600 text-blue-600 py-2 rounded hover:bg-blue-50">Λήψη των δεδομένων μου (JSON)</a>
      {isWithdrawn ? (
        <p className="text-sm text-gray-500 text-center">Η συναίνεσή σας έχει ανακληθεί.</p>
      ) : (
        <button onClick={withdraw} disabled={busy} className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 disabled:opacity-50">Ανάκληση συναίνεσης</button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Build**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npm run build 2>&1 | tail -20`
Expected: build succeeds; `/c/[slug]/manage` and `/c/[slug]/manage/[token]` in route list.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(public)/c/[slug]/manage"
git commit -m "feat: add public preference center pages"
```

---

## Phase 10 — Navigation, OpenAPI, seed

### Task 25: Sidebar navigation

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Add the nav group**

In `src/components/layout/sidebar.tsx`, locate the `navGroups` array. Add a new group object after the "Λειτουργίες" group (use an icon already imported, e.g. `MdAssignment`, or add `MdFactCheck`/`MdLibraryBooks` — check the existing `react-icons/md` import line and reuse one of those names):
```tsx
  {
    id: "consent",
    label: "Συναινέσεις",
    items: [
      { label: "Πεδία Δεδομένων", href: "/consent/fields", icon: MdLibraryBooks },
      { label: "Consent Projects", href: "/consent/projects", icon: MdAssignment },
    ],
  },
```

- [ ] **Step 2: Build**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npm run build 2>&1 | tail -20`
Expected: build succeeds (no missing-icon errors). If an icon name isn't imported, add it to the existing `import { ... } from "react-icons/md"` line.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: add Consent section to sidebar nav"
```

### Task 26: OpenAPI documentation

**Files:**
- Modify: `src/app/api/public/openapi.json/route.ts`

- [ ] **Step 1: Add path entries**

Open `src/app/api/public/openapi.json/route.ts`. It returns an OpenAPI object with a `paths` map (matching the style of the existing `/ropa`, `/policies` entries). Add two entries to `paths`, mirroring the existing entries' shape (X-API-Key security, 200/401 responses):
```jsonc
"/gdpr/consent/projects": {
  "get": {
    "summary": "List consent projects",
    "security": [{ "ApiKeyAuth": [] }],
    "responses": { "200": { "description": "Array of consent projects with counts" }, "401": { "description": "Invalid API key" } }
  }
},
"/gdpr/consent/projects/{slug}/records": {
  "get": {
    "summary": "List all consent records for a project (JSON export)",
    "security": [{ "ApiKeyAuth": [] }],
    "parameters": [
      { "name": "slug", "in": "path", "required": true, "schema": { "type": "string" } },
      { "name": "status", "in": "query", "required": false, "schema": { "type": "string", "enum": ["PENDING", "CONFIRMED", "WITHDRAWN"] } }
    ],
    "responses": { "200": { "description": "Consent records" }, "401": { "description": "Invalid API key" }, "404": { "description": "Project not found" } }
  }
}
```
Match the exact object/format used by the surrounding code (it may build the object in TypeScript rather than raw JSON — adapt the syntax to fit; keys and structure stay the same).

- [ ] **Step 2: Verify JSON validity**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npx tsc --noEmit 2>&1 | grep "openapi" | head`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/public/openapi.json/route.ts
git commit -m "docs: add consent endpoints to OpenAPI spec"
```

### Task 27: Seed starter personal-data fields

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Add a seed block**

In `prisma/seed.ts`, before the final disconnect/`main()` completion, add an idempotent upsert block (follow the file's existing prisma instance variable name — it may be `prisma` or a local `db`; match it):
```ts
  const starterFields = [
    { key: "full_name", label: { el: "Ονοματεπώνυμο", en: "Full name" }, description: { el: "Το πλήρες όνομα του υποκειμένου.", en: "The data subject's full name." }, category: "IDENTITY", inputType: "TEXT" },
    { key: "email", label: { el: "Email", en: "Email" }, description: { el: "Διεύθυνση ηλεκτρονικού ταχυδρομείου.", en: "Email address." }, category: "CONTACT", inputType: "EMAIL" },
    { key: "phone", label: { el: "Τηλέφωνο", en: "Phone" }, description: { el: "Αριθμός τηλεφώνου επικοινωνίας.", en: "Contact phone number." }, category: "CONTACT", inputType: "PHONE" },
    { key: "afm", label: { el: "ΑΦΜ", en: "Tax ID (AFM)" }, description: { el: "Αριθμός Φορολογικού Μητρώου.", en: "Greek tax registration number." }, category: "FINANCIAL", inputType: "TEXT" },
    { key: "address", label: { el: "Διεύθυνση", en: "Address" }, description: { el: "Ταχυδρομική διεύθυνση.", en: "Postal address." }, category: "CONTACT", inputType: "TEXTAREA" },
  ] as const;

  for (const f of starterFields) {
    await prisma.personalDataField.upsert({
      where: { key: f.key },
      update: {},
      create: { key: f.key, label: f.label, description: f.description, category: f.category as never, inputType: f.inputType as never },
    });
  }
  console.log(`Seeded ${starterFields.length} personal data fields`);
```

- [ ] **Step 2: Run the seed**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npm run seed 2>&1 | tail -10`
Expected: "Seeded 5 personal data fields" (and no errors). If the DB is unreachable, note it must be run when the DB is available.

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: seed starter personal data fields"
```

---

## Phase 11 — Final verification

### Task 28: Full build + test suite

- [ ] **Step 1: Run all unit tests**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npm test`
Expected: all test files pass (localized, slug, consent-token, deepseek, sms, consent-email, consent-excel).

- [ ] **Step 2: Full production build**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npm run build 2>&1 | tail -30`
Expected: build succeeds. Confirm these routes are listed:
`/consent/fields`, `/consent/projects`, `/consent/projects/[id]`, `/consent/projects/[id]/records`,
`/c/[slug]`, `/c/[slug]/confirm/[token]`, `/c/[slug]/manage`, `/c/[slug]/manage/[token]`,
`/api/public/consent/[slug]/submit`, `/api/public/consent/confirm/[token]`,
`/api/public/gdpr/consent/projects`, `/api/public/gdpr/consent/projects/[slug]/records`,
`/api/export/consent/[projectId]`.

- [ ] **Step 3: Lint**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npm run lint 2>&1 | tail -20`
Expected: no new errors in `src/actions/consent.ts`, `src/lib/consent-*`, `src/app/(public)/c`, `src/app/api/public/consent`. Fix any reported issues.

- [ ] **Step 4: Manual smoke (requires a running DB + `npm run dev`)**

Manual checklist:
1. `/consent/fields` → add a field; click "Πρόταση βάσης" (needs `DEEPSEEK_API_KEY`) → suggestions populate.
2. `/consent/projects` → create a project; open it; select fields; add a purpose; set status ACTIVE.
3. Visit `/c/<slug>` → submit the form → record created PENDING; verify email logged/sent.
4. Hit the confirm URL → record becomes CONFIRMED with IP/time on `/consent/projects/<id>/records`.
5. `/c/<slug>/manage` → enter email → manage link; open it → download JSON, then withdraw → a `DataSubjectRequest` appears under `/admin/dsr`.
6. `/consent/projects/<id>/records` → "Εξαγωγή Excel" downloads a populated `.xlsx`.
7. `GET /api/public/gdpr/consent/projects/<slug>/records` with `X-API-Key` → JSON list.

- [ ] **Step 5: Final commit (if any lint fixes)**

```bash
git add -A
git commit -m "chore: final lint + verification for consent module"
```

---

## Notes for the engineer
- **Prisma JSON typing:** writing `LocalizedText` into a `Json` column may need `as never`/`as Prisma.InputJsonValue`. The plan uses `as never` casts where needed — keep them minimal and localized.
- **Next 16 params:** route/page `params` are async (`Promise<…>`) — always `await params`. This is reflected in every handler above.
- **`NEXT_PUBLIC_APP_URL`:** add it to `.env`/`.env.example` for absolute email links; routes fall back to the request origin if unset.
- **DeepSeek:** requires `DEEPSEEK_API_KEY` in `.env` (already used by existing AI routes). Translate/legal-basis features no-op gracefully (surface an error) without it.
- **Button props:** `src/components/ui/button.tsx` — confirm it accepts `size`/`variant`; the plan assumes shadcn defaults. If absent, remove those props (use `className`).
