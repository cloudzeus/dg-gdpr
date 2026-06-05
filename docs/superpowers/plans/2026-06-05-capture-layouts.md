# Per-Project Capture Layouts + Signature — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an internal employee "capture consent" flow where each project picks a layout template (registry-based), including a Kosmocar-style multi-step wizard with customer signature uploaded to Bunny CDN.

**Architecture:** A `layoutTemplate` key on `ConsentProject` selects a self-contained template component (own folder + CSS module) from a registry. `/capture` lists projects as cards; `/capture/[slug]` renders the project's template with its dynamic fields/purposes. The wizard captures a PNG signature, a server action uploads it to Bunny and creates a CONFIRMED record + confirmation email.

**Tech Stack:** Next.js 16.2 (App Router, Server Actions, CSS Modules), Prisma 5 + MySQL, React 19, Vitest, Bunny CDN (`uploadToBunny`).

---

## File Structure

**New**
- `src/lib/data-url.ts` (+ `data-url.test.ts`) — parse a base64 data URL to a Buffer.
- `src/actions/capture.ts` — `captureConsent` server action.
- `src/components/capture/templates/types.ts` — shared template prop types.
- `src/components/capture/templates/index.ts` — registry.
- `src/components/capture/templates/default/default-capture.tsx` + `default.module.css`
- `src/components/capture/templates/wizard-signature/wizard-signature.tsx` + `wizard-signature.module.css` + `signature-pad.tsx`
- `src/app/(app)/capture/page.tsx` — project picker.
- `src/app/(app)/capture/[slug]/page.tsx` — template host.

**Modified**
- `prisma/schema.prisma` — `layoutTemplate`, `signatureUrl`, `capturedById`, `ConfirmationMethod.IN_PERSON`.
- `src/actions/consent.ts` — `updateConsentProject` accepts `layoutTemplate`.
- `src/app/(app)/consent/projects/[id]/project-editor.tsx` — layout select.
- `src/app/(app)/consent/projects/[id]/page.tsx` — pass `layoutTemplate` to the editor.
- `src/components/layout/sidebar.tsx` — "Λήψη Συναίνεσης" link.

---

## Task 1: data-url parser (TDD)

**Files:**
- Create: `src/lib/data-url.ts`
- Test: `src/lib/data-url.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/data-url.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { dataUrlToBuffer } from "@/lib/data-url";

describe("dataUrlToBuffer", () => {
  it("parses a base64 PNG data URL", () => {
    const payload = Buffer.from("hello").toString("base64");
    const { buffer, contentType } = dataUrlToBuffer(`data:image/png;base64,${payload}`);
    expect(contentType).toBe("image/png");
    expect(buffer.toString()).toBe("hello");
  });

  it("throws on a non-data URL", () => {
    expect(() => dataUrlToBuffer("https://example.com/x.png")).toThrow();
  });

  it("throws on a malformed data URL", () => {
    expect(() => dataUrlToBuffer("data:image/png,notbase64")).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npx vitest run src/lib/data-url.test.ts`
Expected: FAIL — cannot resolve `@/lib/data-url`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/data-url.ts`:

```ts
/** Parse a base64 data URL (`data:<mime>;base64,<payload>`) into a Buffer. */
export function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; contentType: string } {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw new Error("Μη έγκυρο data URL");
  return { buffer: Buffer.from(match[2], "base64"), contentType: match[1] };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npx vitest run src/lib/data-url.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && git add src/lib/data-url.ts src/lib/data-url.test.ts && git commit -m "feat(capture): add data URL → Buffer parser with tests"
```

---

## Task 2: Prisma schema — layoutTemplate, signature fields, IN_PERSON

**Files:**
- Modify: `prisma/schema.prisma`

> Per project DB strategy: `db push`, NEVER `migrate dev`.

- [ ] **Step 1: Add `layoutTemplate` to ConsentProject**

In `prisma/schema.prisma`, in `model ConsentProject`, just after the `confirmationMethod ConfirmationMethod   @default(EMAIL)` line, add:

```prisma
  layoutTemplate     String              @default("DEFAULT")
```

- [ ] **Step 2: Add signature fields to ConsentRecord**

In `model ConsentRecord`, just after the `confirmationChannel ConfirmationMethod?` line, add:

```prisma
  signatureUrl        String?             @db.Text
  capturedById        String?
```

- [ ] **Step 3: Add IN_PERSON to the ConfirmationMethod enum**

In `enum ConfirmationMethod`, after `BOTH`, add:

```prisma
  IN_PERSON
```

(First READ `prisma/schema.prisma` to confirm each anchor before editing.)

- [ ] **Step 4: Push and regenerate**

```bash
cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npx prisma db push && npx prisma generate
```
Expected: "Your database is now in sync with your Prisma schema." + "Generated Prisma Client".

- [ ] **Step 5: Type-check**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && git add prisma/schema.prisma && git commit -m "feat(capture): add layoutTemplate, signature fields, IN_PERSON enum"
```

---

## Task 3: capture server action + updateConsentProject extension

**Files:**
- Create: `src/actions/capture.ts`
- Modify: `src/actions/consent.ts`

- [ ] **Step 1: Create `src/actions/capture.ts`**

```ts
"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { logAction } from "@/lib/action-logger";
import { getClientIp, generateConsentToken } from "@/lib/consent-token";
import { uploadToBunny } from "@/lib/bunny";
import { dataUrlToBuffer } from "@/lib/data-url";
import { sendMail } from "@/lib/mail";
import { consentConfirmedEmail } from "@/lib/consent-email";

interface CaptureInput {
  slug: string;
  values: Record<string, string>;
  purposeConsents: Record<string, boolean>;
  subjectEmail: string;
  subjectPhone?: string;
  signatureDataUrl?: string;
}

export async function captureConsent(input: CaptureInput): Promise<{ recordId: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Μη εξουσιοδοτημένος");

  const email = input.subjectEmail?.trim();
  if (!email) throw new Error("Απαιτείται email πελάτη");

  const project = await prisma.consentProject.findUnique({ where: { slug: input.slug } });
  if (!project || project.status !== "ACTIVE") throw new Error("Το project δεν είναι ενεργό");

  let signatureUrl: string | null = null;
  if (input.signatureDataUrl) {
    const { buffer, contentType } = dataUrlToBuffer(input.signatureDataUrl);
    if (contentType !== "image/png") throw new Error("Η υπογραφή πρέπει να είναι PNG");
    if (buffer.length > 2 * 1024 * 1024) throw new Error("Η υπογραφή είναι πολύ μεγάλη (μέγ. 2MB)");
    signatureUrl = await uploadToBunny(buffer, `signatures/${generateConsentToken()}.png`, "image/png");
  }

  const hdrs = await headers();
  const now = new Date();
  const record = await prisma.consentRecord.create({
    data: {
      projectId: project.id,
      subjectEmail: email,
      subjectPhone: input.subjectPhone?.trim() || null,
      values: input.values as never,
      purposeConsents: input.purposeConsents as never,
      status: "CONFIRMED",
      verifyToken: generateConsentToken(),
      confirmedAt: now,
      ipAddress: getClientIp(hdrs),
      userAgent: hdrs.get("user-agent") ?? null,
      confirmationChannel: "IN_PERSON",
      signatureUrl,
      capturedById: session.user.id,
      locale: "el",
    },
  });

  const mail = consentConfirmedEmail({ projectName: project.name, confirmedAt: now });
  await sendMail({ to: email, subject: mail.subject, html: mail.html });

  await logAction({ action: "CAPTURE", entity: "ConsentRecord", entityId: record.id });
  return { recordId: record.id };
}
```

- [ ] **Step 2: Extend `updateConsentProject` to accept `layoutTemplate`**

In `src/actions/consent.ts`, find the `updateConsentProject` input type:

```ts
  input: Partial<{
    name: string;
    description: LocalizedText;
    status: ConsentProjectStatus;
    confirmationMethod: ConfirmationMethod;
  }>,
```

Replace it with (add one line):

```ts
  input: Partial<{
    name: string;
    description: LocalizedText;
    status: ConsentProjectStatus;
    confirmationMethod: ConfirmationMethod;
    layoutTemplate: string;
  }>,
```

- [ ] **Step 3: Type-check**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && git add src/actions/capture.ts src/actions/consent.ts && git commit -m "feat(capture): captureConsent action + layoutTemplate on updateConsentProject"
```

---

## Task 4: Template types, registry, and DEFAULT template

**Files:**
- Create: `src/components/capture/templates/types.ts`
- Create: `src/components/capture/templates/default/default-capture.tsx`
- Create: `src/components/capture/templates/default/default.module.css`
- Create: `src/components/capture/templates/index.ts`

- [ ] **Step 1: Create `types.ts`**

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

/** Pick the contact email/phone from configured field types (shared by templates). */
export function findContactFields(fields: FieldDef[]) {
  return {
    emailField: fields.find((f) => f.inputType === "EMAIL") ?? null,
    phoneField: fields.find((f) => f.inputType === "PHONE") ?? null,
  };
}
```

- [ ] **Step 2: Create `default/default.module.css`**

```css
.wrap { max-width: 680px; margin: 0 auto; padding: 32px 20px 64px; }
.card { background: #fff; border: 1px solid #edebe9; border-radius: 12px; padding: 24px; box-shadow: 0 1px 2px rgba(0,0,0,.06); }
.title { font-size: 22px; font-weight: 700; color: #201f1e; }
.desc { margin-top: 6px; font-size: 14px; color: #605e5c; }
.group { margin-top: 16px; display: flex; flex-direction: column; gap: 6px; }
.label { font-size: 13px; font-weight: 600; color: #201f1e; }
.input { height: 40px; border: 1px solid #8a8886; border-radius: 6px; padding: 0 12px; font-size: 14px; }
.input:focus { outline: none; border-color: #0078d4; box-shadow: 0 0 0 2px rgba(0,120,212,.25); }
.purposes { margin-top: 20px; display: flex; flex-direction: column; gap: 10px; }
.purpose { display: flex; gap: 10px; align-items: flex-start; border: 1px solid #edebe9; border-radius: 8px; padding: 12px; cursor: pointer; }
.btn { margin-top: 20px; width: 100%; height: 44px; border: none; border-radius: 6px; background: #0078d4; color: #fff; font-weight: 600; cursor: pointer; }
.btn:disabled { opacity: .5; }
.err { margin-top: 12px; color: #a4262c; font-size: 14px; }
.ok { margin-top: 12px; color: #107c10; font-size: 14px; }
```

- [ ] **Step 3: Create `default/default-capture.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { captureConsent } from "@/actions/capture";
import { findContactFields, type CaptureTemplateProps } from "../types";
import styles from "./default.module.css";

const HTML_TYPE: Record<string, string> = { TEXT: "text", EMAIL: "email", PHONE: "tel", DATE: "date", NUMBER: "number" };

export default function DefaultCapture({ project, fields, purposes }: CaptureTemplateProps) {
  const { emailField, phoneField } = findContactFields(fields);
  const [values, setValues] = useState<Record<string, string>>({});
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [doneRef, setDoneRef] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const subjectEmail = emailField ? values[emailField.key] ?? "" : email;
    const subjectPhone = phoneField ? values[phoneField.key] : undefined;
    startTransition(async () => {
      try {
        const res = await captureConsent({ slug: project.slug, values, purposeConsents: consents, subjectEmail, subjectPhone });
        setDoneRef(res.recordId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Σφάλμα");
      }
    });
  }

  if (doneRef) {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <p className={styles.title}>Καταχωρήθηκε ✔</p>
          <p className={styles.desc}>Αριθμός αναφοράς: <strong>{doneRef}</strong></p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={submit}>
        <h1 className={styles.title}>{project.name}</h1>
        {project.description && <p className={styles.desc}>{project.description}</p>}

        {!emailField && (
          <div className={styles.group}>
            <label className={styles.label}>Email *</label>
            <input className={styles.input} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        )}

        {fields.map((f) => (
          <div key={f.key} className={styles.group}>
            <label className={styles.label}>{f.label}{f.required || f.inputType === "EMAIL" ? " *" : ""}</label>
            <input
              className={styles.input}
              type={HTML_TYPE[f.inputType] ?? "text"}
              required={f.required || f.inputType === "EMAIL"}
              value={values[f.key] ?? ""}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
            />
          </div>
        ))}

        <div className={styles.purposes}>
          {purposes.map((p) => (
            <label key={p.id} className={styles.purpose}>
              <input type="checkbox" checked={consents[p.id] ?? false} onChange={(e) => setConsents({ ...consents, [p.id]: e.target.checked })} />
              <span><strong>{p.label}{p.required ? " *" : ""}</strong><br /><span style={{ color: "#605e5c", fontSize: 13 }}>{p.description}</span></span>
            </label>
          ))}
        </div>

        {error && <p className={styles.err}>{error}</p>}
        <button className={styles.btn} type="submit" disabled={isPending}>{isPending ? "Υποβολή…" : "Υποβολή συναίνεσης"}</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Create `index.ts` (registry)**

```ts
import type { CaptureTemplate } from "./types";
import DefaultCapture from "./default/default-capture";
import WizardSignature from "./wizard-signature/wizard-signature";

export const CAPTURE_TEMPLATES: Record<string, CaptureTemplate> = {
  DEFAULT: DefaultCapture,
  WIZARD_SIGNATURE: WizardSignature,
};

export function resolveTemplate(key: string): CaptureTemplate {
  return CAPTURE_TEMPLATES[key] ?? DefaultCapture;
}

export const TEMPLATE_OPTIONS = [
  { value: "DEFAULT", label: "Προεπιλογή (απλή φόρμα)" },
  { value: "WIZARD_SIGNATURE", label: "Wizard με υπογραφή (Kosmocar style)" },
];
```

(Note: `index.ts` imports `WizardSignature` which is created in Task 5. This task will not type-check until Task 5 is done — that is expected; do the type-check at the end of Task 5.)

- [ ] **Step 5: Commit**

```bash
cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && git add src/components/capture/templates/types.ts src/components/capture/templates/index.ts "src/components/capture/templates/default" && git commit -m "feat(capture): template types, registry, DEFAULT template"
```

---

## Task 5: WIZARD_SIGNATURE template + signature pad

**Files:**
- Create: `src/components/capture/templates/wizard-signature/wizard-signature.module.css`
- Create: `src/components/capture/templates/wizard-signature/signature-pad.tsx`
- Create: `src/components/capture/templates/wizard-signature/wizard-signature.tsx`

- [ ] **Step 1: Create `wizard-signature.module.css`** (Kosmocar aesthetic, scoped)

```css
.root { --accent:#00a650; --accent-dark:#008a43; --fg:#1a1a1a; --muted:#6e6e73; --border:#e5e5e7; --surface:#f8f9fa; --success:#34c759;
  min-height: 100%; background: linear-gradient(180deg,#fafafa 0%,#fff 40%,#f5f5f7 100%); color: var(--fg);
  font: 16px/1.5 -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif; }
.header { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between;
  padding: 16px 24px; background: rgba(255,255,255,.95); backdrop-filter: saturate(180%) blur(20px); border-bottom: 1px solid rgba(0,0,0,.06); }
.headerTitle { font-size: 12px; font-weight: 600; color: var(--muted); }
.steps { display: flex; align-items: center; gap: 8px; }
.step { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; font-size: 13px; font-weight: 600;
  background: var(--surface); border: 2px solid var(--border); color: var(--muted); }
.stepActive { background: var(--accent); border-color: var(--accent); color: #fff; }
.stepDone { background: var(--success); border-color: var(--success); color: #fff; }
.line { width: 22px; height: 2px; background: var(--border); }
.lineDone { background: var(--success); }
.content { max-width: 680px; margin: 0 auto; padding: 36px 20px 140px; }
.h1 { font-size: 30px; font-weight: 700; letter-spacing: -.02em; margin-bottom: 6px; }
.sub { color: var(--muted); font-size: 16px; margin-bottom: 28px; }
.card { background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04); }
.section { padding: 24px; border-bottom: 1px solid var(--border); }
.section:last-child { border-bottom: none; }
.row { display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 16px; }
.row:last-child { margin-bottom: 0; }
.group { display: flex; flex-direction: column; }
.label { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
.req { color: #ff3b30; }
.input { height: 50px; padding: 0 16px; font-size: 16px; background: var(--surface); border: 1.5px solid var(--border); border-radius: 12px; color: var(--fg); }
.input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 4px rgba(0,166,80,.12); background: #fff; }
.consentItem { display: flex; gap: 16px; align-items: flex-start; padding: 16px; border-radius: 14px; cursor: pointer; }
.consentItem:hover { background: var(--surface); }
.consentItem input { width: 24px; height: 24px; accent-color: var(--accent); margin-top: 2px; }
.consentText h3 { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
.consentText p { font-size: 13px; color: var(--muted); }
.sigArea { position: relative; border: 2px dashed var(--border); border-radius: 18px; height: 260px; background: linear-gradient(180deg,#fafbfc,#f5f6f8); touch-action: none; overflow: hidden; }
.sigArea.signed { border-style: solid; border-color: var(--success); }
.sigPlaceholder { position: absolute; inset: 0; display: grid; place-items: center; color: var(--muted); opacity: .5; pointer-events: none; }
.sigPlaceholder.hidden { display: none; }
.canvas { width: 100%; height: 100%; }
.sigActions { display: flex; justify-content: flex-end; margin-top: 12px; }
.clearBtn { background: transparent; border: none; color: var(--accent); font-size: 14px; font-weight: 600; cursor: pointer; padding: 8px 16px; border-radius: 8px; }
.footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; justify-content: space-between; align-items: center;
  padding: 16px 24px; background: rgba(255,255,255,.95); backdrop-filter: saturate(180%) blur(20px); border-top: 1px solid rgba(0,0,0,.06); }
.btn { height: 50px; padding: 0 32px; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; border: none; }
.btnSecondary { background: transparent; color: var(--accent); }
.btnPrimary { background: linear-gradient(145deg,var(--accent),var(--accent-dark)); color: #fff; box-shadow: 0 4px 16px rgba(0,166,80,.3); }
.btnPrimary:disabled { background: var(--border); color: var(--muted); box-shadow: none; cursor: not-allowed; }
.successIcon { width: 88px; height: 88px; border-radius: 50%; margin: 0 auto 28px; display: grid; place-items: center;
  background: linear-gradient(145deg,var(--accent),var(--accent-dark)); color: #fff; box-shadow: 0 8px 32px rgba(0,166,80,.3); }
.center { text-align: center; }
.ref { margin-top: 20px; padding: 16px 20px; background: #f0f2f4; border: 1px solid var(--border); border-radius: 14px; display: flex; justify-content: space-between; align-items: center; }
.refCode { font-family: ui-monospace, Menlo, monospace; font-weight: 700; font-size: 16px; }
@media (min-width: 640px) { .row.two { grid-template-columns: 1fr 1fr; } }
```

- [ ] **Step 2: Create `signature-pad.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./wizard-signature.module.css";

/** Canvas signature pad. Calls onChange with a PNG data URL (or null when cleared). */
export function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const areaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const area = areaRef.current!;
    const ctx = canvas.getContext("2d")!;
    function resize() {
      const rect = area.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
    resize();
    window.addEventListener("resize", resize);

    function pos(e: MouseEvent | TouchEvent) {
      const rect = canvas.getBoundingClientRect();
      const t = "touches" in e ? e.touches[0] : (e as MouseEvent);
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    function start(e: MouseEvent | TouchEvent) {
      drawing.current = true;
      const p = pos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      setSigned(true);
    }
    function move(e: MouseEvent | TouchEvent) {
      if (!drawing.current) return;
      e.preventDefault();
      const p = pos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    function end() {
      if (!drawing.current) return;
      drawing.current = false;
      onChange(canvas.toDataURL("image/png"));
    }
    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    canvas.addEventListener("mouseup", end);
    canvas.addEventListener("mouseleave", end);
    canvas.addEventListener("touchstart", start);
    canvas.addEventListener("touchmove", move);
    canvas.addEventListener("touchend", end);
    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousedown", start);
      canvas.removeEventListener("mousemove", move);
      canvas.removeEventListener("mouseup", end);
      canvas.removeEventListener("mouseleave", end);
      canvas.removeEventListener("touchstart", start);
      canvas.removeEventListener("touchmove", move);
      canvas.removeEventListener("touchend", end);
    };
  }, [onChange]);

  function clear() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setSigned(false);
    onChange(null);
  }

  return (
    <>
      <div ref={areaRef} className={`${styles.sigArea} ${signed ? styles.signed : ""}`}>
        <div className={`${styles.sigPlaceholder} ${signed ? styles.hidden : ""}`}>Υπογράψτε εδώ</div>
        <canvas ref={canvasRef} className={styles.canvas} />
      </div>
      <div className={styles.sigActions}>
        <button type="button" className={styles.clearBtn} onClick={clear}>Καθαρισμός</button>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Create `wizard-signature.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { captureConsent } from "@/actions/capture";
import { findContactFields, type CaptureTemplateProps } from "../types";
import { SignaturePad } from "./signature-pad";
import styles from "./wizard-signature.module.css";

const HTML_TYPE: Record<string, string> = { TEXT: "text", EMAIL: "email", PHONE: "tel", DATE: "date", NUMBER: "number" };

export default function WizardSignature({ project, fields, purposes }: CaptureTemplateProps) {
  const { emailField, phoneField } = findContactFields(fields);
  const [step, setStep] = useState(0); // 0 details, 1 consent, 2 signature, 3 done
  const [values, setValues] = useState<Record<string, string>>({});
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [signature, setSignature] = useState<string | null>(null);
  const [doneRef, setDoneRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const subjectEmail = emailField ? values[emailField.key] ?? "" : "";
    const subjectPhone = phoneField ? values[phoneField.key] : undefined;
    startTransition(async () => {
      try {
        const res = await captureConsent({
          slug: project.slug, values, purposeConsents: consents,
          subjectEmail, subjectPhone, signatureDataUrl: signature ?? undefined,
        });
        setDoneRef(res.recordId);
        setStep(3);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Σφάλμα");
      }
    });
  }

  const stepClass = (i: number) => `${styles.step} ${step === i ? styles.stepActive : step > i ? styles.stepDone : ""}`;

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <span className={styles.headerTitle}>{project.name}</span>
        <div className={styles.steps}>
          <span className={stepClass(0)}>1</span>
          <span className={`${styles.line} ${step > 0 ? styles.lineDone : ""}`} />
          <span className={stepClass(1)}>2</span>
          <span className={`${styles.line} ${step > 1 ? styles.lineDone : ""}`} />
          <span className={stepClass(2)}>3</span>
        </div>
      </header>

      <main className={styles.content}>
        {step === 0 && (
          <>
            <h1 className={styles.h1}>Στοιχεία Πελάτη</h1>
            <p className={styles.sub}>Συμπληρώστε τα στοιχεία του πελάτη</p>
            <div className={styles.card}>
              <div className={styles.section}>
                {fields.map((f) => (
                  <div key={f.key} className={styles.row}>
                    <div className={styles.group}>
                      <label className={styles.label}>{f.label}{f.required || f.inputType === "EMAIL" ? <span className={styles.req}> *</span> : null}</label>
                      <input
                        className={styles.input}
                        type={HTML_TYPE[f.inputType] ?? "text"}
                        value={values[f.key] ?? ""}
                        onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className={styles.h1}>Σκοποί Επεξεργασίας</h1>
            <p className={styles.sub}>Επιλέξτε τους σκοπούς για τους οποίους συναινεί ο πελάτης</p>
            <div className={styles.card}>
              <div className={styles.section}>
                {purposes.map((p) => (
                  <label key={p.id} className={styles.consentItem}>
                    <input type="checkbox" checked={consents[p.id] ?? false} onChange={(e) => setConsents({ ...consents, [p.id]: e.target.checked })} />
                    <div className={styles.consentText}>
                      <h3>{p.label}{p.required ? " *" : ""}</h3>
                      {p.description && <p>{p.description}</p>}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className={styles.h1}>Υπογραφή Πελάτη</h1>
            <p className={styles.sub}>Ο πελάτης υπογράφει για επιβεβαίωση της συναίνεσης</p>
            <div className={styles.card}>
              <div className={styles.section}>
                <SignaturePad onChange={setSignature} />
              </div>
            </div>
            {error && <p style={{ color: "#a4262c", marginTop: 12 }}>{error}</p>}
          </>
        )}

        {step === 3 && (
          <div className={styles.center}>
            <div className={styles.successIcon}>
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <h1 className={styles.h1}>Ευχαριστούμε</h1>
            <p className={styles.sub}>Η συναίνεση καταχωρήθηκε με επιτυχία</p>
            <div className={styles.ref}>
              <span style={{ color: "#6e6e73", fontSize: 12 }}>Αριθμός αναφοράς</span>
              <code className={styles.refCode}>{doneRef}</code>
            </div>
          </div>
        )}
      </main>

      {step < 3 && (
        <footer className={styles.footer}>
          <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Πίσω</button>
          {step < 2 ? (
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setStep((s) => s + 1)}>Συνέχεια</button>
          ) : (
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={submit} disabled={!signature || isPending}>{isPending ? "Υποβολή…" : "Υποβολή"}</button>
          )}
        </footer>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Type-check (registry now resolves)**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && git add "src/components/capture/templates/wizard-signature" && git commit -m "feat(capture): WIZARD_SIGNATURE template with canvas signature pad"
```

---

## Task 6: Routes — picker + template host

**Files:**
- Create: `src/app/(app)/capture/page.tsx`
- Create: `src/app/(app)/capture/[slug]/page.tsx`

- [ ] **Step 1: Create `capture/page.tsx` (project picker)**

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loc } from "@/lib/localized";
import { Topbar } from "@/components/layout/topbar";

export default async function CapturePickerPage() {
  const session = await auth();
  const projects = await prisma.consentProject.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, description: true },
  });

  if (projects.length === 1) redirect(`/capture/${projects[0].slug}`);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar userName={session?.user?.name} userRole={(session?.user as { role?: string } | undefined)?.role} pageTitle="Λήψη Συναίνεσης" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold" style={{ color: "#201F1E" }}>Επιλέξτε project</h1>
          <p className="mt-1 mb-6 text-sm" style={{ color: "#605E5C" }}>Διαλέξτε για ποιο project θα καταχωρήσετε συναίνεση.</p>
          {projects.length === 0 ? (
            <p className="text-sm text-neutral-500">Δεν υπάρχουν ενεργά projects.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/capture/${p.slug}`}
                  className="rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                  style={{ borderColor: "#EDEBE9" }}
                >
                  <div className="mb-3 h-1 w-10 rounded-full" style={{ background: "#0078D4" }} />
                  <p className="text-base font-semibold" style={{ color: "#201F1E" }}>{p.name}</p>
                  <p className="mt-1 line-clamp-2 text-sm" style={{ color: "#605E5C" }}>{loc(p.description, "el")}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Create `capture/[slug]/page.tsx` (template host)**

```tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loc } from "@/lib/localized";
import { resolveTemplate } from "@/components/capture/templates";

export default async function CaptureRunPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await prisma.consentProject.findUnique({
    where: { slug },
    include: { fields: { include: { field: true }, orderBy: { order: "asc" } }, purposes: { orderBy: { order: "asc" } } },
  });
  if (!project || project.status !== "ACTIVE") notFound();

  const fields = project.fields.map((pf) => ({
    key: pf.field.key, label: loc(pf.field.label, "el"), inputType: pf.field.inputType, required: pf.required,
  }));
  const purposes = project.purposes.map((p) => ({
    id: p.id, label: loc(p.label, "el"), description: loc(p.description, "el"), required: p.required,
  }));

  const Template = resolveTemplate(project.layoutTemplate);
  return <Template project={{ slug, name: project.name, description: loc(project.description, "el") }} fields={fields} purposes={purposes} />;
}
```

- [ ] **Step 3: Type-check + build**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npx tsc --noEmit && npm run build`
Expected: compiles; routes `/capture` and `/capture/[slug]` appear.

- [ ] **Step 4: Commit**

```bash
cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && git add "src/app/(app)/capture" && git commit -m "feat(capture): project picker + template host routes"
```

---

## Task 7: Admin layout select + sidebar link

**Files:**
- Modify: `src/app/(app)/consent/projects/[id]/project-editor.tsx`
- Modify: `src/app/(app)/consent/projects/[id]/page.tsx`
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Add `layoutTemplate` to the editor's `ProjectData` + state**

In `project-editor.tsx`, in the `ProjectData` interface, change:
```ts
  status: string; confirmationMethod: string;
```
to:
```ts
  status: string; confirmationMethod: string; layoutTemplate: string;
```

Then near the other state hooks (after `const [method, setMethod] = useState(project.confirmationMethod);`), add:
```ts
  const [layout, setLayout] = useState(project.layoutTemplate ?? "DEFAULT");
```

Add this import at the top (with the other `@/` imports):
```ts
import { TEMPLATE_OPTIONS } from "@/components/capture/templates";
```

- [ ] **Step 2: Include `layoutTemplate` in the save call**

In `project-editor.tsx`, find:
```ts
      await updateConsentProject(project.id, {
        name, description: { el: descEl, en: descEn }, status: status as never, confirmationMethod: method as never,
```
Replace that object's contents with (add `layoutTemplate: layout,`):
```ts
      await updateConsentProject(project.id, {
        name, description: { el: descEl, en: descEn }, status: status as never, confirmationMethod: method as never, layoutTemplate: layout,
```

- [ ] **Step 3: Render the layout `<select>`**

In `project-editor.tsx`, immediately AFTER the confirmation-method `<select>` block (the one bound to `value={method}`), add:

```tsx
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-neutral-500">Layout οθονών (εσωτερική καταχώρηση)</label>
              <select className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm" value={layout} onChange={(e) => setLayout(e.target.value)}>
                {TEMPLATE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
```

- [ ] **Step 4: Pass `layoutTemplate` from the project page to the editor**

In `src/app/(app)/consent/projects/[id]/page.tsx`, find where the `ProjectData`-shaped object is built for `<ProjectEditor project={...} />` (it sets `status` and `confirmationMethod`). Add `layoutTemplate: project.layoutTemplate,` next to them. If the page selects specific fields from prisma, ensure `layoutTemplate` is included (the default `findUnique` without `select` returns all scalar columns, so no query change is needed unless an explicit `select` is used — if so, add `layoutTemplate: true`).

- [ ] **Step 5: Add the sidebar link**

In `src/components/layout/sidebar.tsx`, add `MdDraw` to the `react-icons/md` import list. Then in the `consent` group `items` array, after the "Όλες οι Συναινέσεις" item, add:
```ts
      { label: "Λήψη Συναίνεσης", href: "/capture", icon: MdDraw },
```

- [ ] **Step 6: Type-check**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && git add "src/app/(app)/consent/projects/[id]/project-editor.tsx" "src/app/(app)/consent/projects/[id]/page.tsx" src/components/layout/sidebar.tsx && git commit -m "feat(capture): project layout select + sidebar link"
```

---

## Task 8: Final verification

- [ ] **Step 1: Run tests**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npm test`
Expected: all pass (incl. `data-url.test.ts`).

- [ ] **Step 2: Production build**

Run: `cd /Volumes/EXTERNALSSD/DGSMART/dg-gdpr && npm run build`
Expected: succeeds; `/capture` and `/capture/[slug]` present.

- [ ] **Step 3: Manual smoke (dev)**

`npm run dev`, then:
1. Admin → a Consent Project → set "Layout οθονών" = "Wizard με υπογραφή" → Save.
2. Set the project ACTIVE.
3. Sidebar → "Λήψη Συναίνεσης" → pick the project (or auto-redirect if it's the only ACTIVE one).
4. Walk the wizard: fill fields → consent → sign on canvas → Υποβολή → confirmation with a reference number.
5. Verify a CONFIRMED record exists with a `signatureUrl` (Bunny) and `capturedById`, and the customer received the confirmation email.

Expected: all steps behave as described.

---

## Self-Review Notes

- **Spec coverage:** routes `/capture` + `/capture/[slug]` (Task 6) ✓; Prisma `layoutTemplate`/`signatureUrl`/`capturedById`/`IN_PERSON` (Task 2) ✓; registry + self-contained template folders with own CSS modules (Tasks 4–5) ✓; dynamic fields/purposes (Tasks 4–6) ✓; signature → Bunny + CONFIRMED + email (Task 3) ✓; admin association select (Task 7) ✓; sidebar link (Task 7) ✓; tested util (Task 1) ✓.
- **Type consistency:** `CaptureTemplateProps`/`FieldDef`/`PurposeDef` defined in `types.ts` (Task 4) and consumed by both templates (Tasks 4–5) and the host route (Task 6); `findContactFields` shared; `resolveTemplate`/`TEMPLATE_OPTIONS` from `index.ts` used by the host route and the editor; `captureConsent` signature identical across both templates.
- **Note:** `index.ts` (Task 4) imports the Task-5 component, so the type-check is deferred to the end of Task 5 — called out explicitly in Task 4 Step 4.
- **Out of scope:** config-driven theming, employee login screen, per-client brand-logos strip, admin signature preview.
```
