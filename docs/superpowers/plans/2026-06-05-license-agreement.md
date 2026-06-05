# Άδεια Χρήσης Εφαρμογής — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a super-admin–only license configuration form (serial + seller/buyer companies) and a "Άδεια Χρήσης" sidebar link that opens a read-only license modal for all users.

**Architecture:** A singleton `License` Prisma model (like `Organization`) holds the data; a new `User.isSuperAdmin` flag gates writes. Server actions in `src/actions/license.ts` handle read (any user) and write (super-admin). A pure `buildLicenseSections()` helper renders the Greek EULA text (unit-tested). The settings page conditionally shows an editor; the sidebar shows a modal-opening action item.

**Tech Stack:** Next.js 16.2 (App Router, Server Actions), Prisma 5 + MySQL, React 19, Vitest (node env), Tailwind 4, react-icons/lucide-react.

---

## File Structure

**New files**
- `src/lib/license-text.ts` — pure function building license sections (no I/O).
- `src/lib/license-text.test.ts` — vitest unit tests for the above.
- `src/actions/license.ts` — server actions: `getLicense`, `updateLicense`, internal `requireSuperAdmin`.
- `src/components/modules/license-editor.tsx` — client form (settings, super-admin only).
- `src/components/modules/license-modal.tsx` — client modal (all users, read-only).

**Modified files**
- `prisma/schema.prisma` — add `License` model + `User.isSuperAdmin`.
- `src/app/(app)/settings/page.tsx` — fetch license + render editor card when super-admin.
- `src/components/layout/sidebar.tsx` — add license action item + render modal.

---

## Task 1: License text builder (TDD)

**Files:**
- Create: `src/lib/license-text.ts`
- Test: `src/lib/license-text.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/license-text.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildLicenseSections } from "@/lib/license-text";

const FULL = {
  serialNumber: "DG-2026-0001",
  sellerName: "DG Smart ΙΚΕ",
  sellerVat: "800000001",
  buyerName: "Πελάτης ΑΕ",
  buyerVat: "094000002",
};

describe("buildLicenseSections", () => {
  it("returns a stable list of 9 sections", () => {
    const sections = buildLicenseSections(FULL);
    expect(sections).toHaveLength(9);
    expect(sections.every((s) => s.title.length > 0)).toBe(true);
    expect(sections.every((s) => Array.isArray(s.paragraphs) && s.paragraphs.length > 0)).toBe(true);
  });

  it("embeds serial, seller and buyer in the details section", () => {
    const details = buildLicenseSections(FULL)[0];
    const text = details.paragraphs.join(" ");
    expect(text).toContain("DG-2026-0001");
    expect(text).toContain("DG Smart ΙΚΕ");
    expect(text).toContain("800000001");
    expect(text).toContain("Πελάτης ΑΕ");
    expect(text).toContain("094000002");
  });

  it("uses a placeholder for missing fields", () => {
    const details = buildLicenseSections({
      serialNumber: null, sellerName: null, sellerVat: null, buyerName: null, buyerVat: null,
    })[0];
    const text = details.paragraphs.join(" ");
    expect(text).toContain("—");
  });

  it("omits ΑΦΜ wrapper when vat is missing but name present", () => {
    const details = buildLicenseSections({
      serialNumber: "X", sellerName: "Seller", sellerVat: null, buyerName: "Buyer", buyerVat: null,
    })[0];
    const text = details.paragraphs.join(" ");
    expect(text).toContain("Seller");
    expect(text).not.toContain("ΑΦΜ:");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/license-text.test.ts`
Expected: FAIL — cannot resolve `@/lib/license-text` / `buildLicenseSections is not a function`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/license-text.ts`:

```ts
export interface LicenseInfo {
  serialNumber: string | null;
  sellerName: string | null;
  sellerVat: string | null;
  buyerName: string | null;
  buyerVat: string | null;
}

export interface LicenseSection {
  title: string;
  paragraphs: string[];
}

const PLACEHOLDER = "—";

function company(name: string | null, vat: string | null): string {
  const n = name?.trim() || PLACEHOLDER;
  const v = vat?.trim();
  return v ? `${n} (ΑΦΜ: ${v})` : n;
}

/**
 * Builds the Greek software license (EULA) as structured sections.
 * Pure: no I/O. Missing fields render as "—".
 */
export function buildLicenseSections(license: LicenseInfo): LicenseSection[] {
  const serial = license.serialNumber?.trim() || PLACEHOLDER;
  const seller = company(license.sellerName, license.sellerVat);
  const buyer = company(license.buyerName, license.buyerVat);

  return [
    {
      title: "1. Στοιχεία Άδειας",
      paragraphs: [
        `Αριθμός Σειράς (Serial Number): ${serial}.`,
        `Πάροχος / Δικαιοπάροχος (πωλήτρια εταιρία): ${seller}.`,
        `Κάτοχος Άδειας (αγοράστρια εταιρία): ${buyer}.`,
      ],
    },
    {
      title: "2. Αντικείμενο",
      paragraphs: [
        "Η παρούσα Άδεια Χρήσης Λογισμικού (η «Άδεια») διέπει τη χρήση της εφαρμογής «GDPR Compliance OS» (το «Λογισμικό»), συμπεριλαμβανομένων των ενημερώσεων, της τεκμηρίωσης και κάθε σχετικού υλικού, που παρέχεται από τον Δικαιοπάροχο προς τον Κάτοχο Άδειας.",
      ],
    },
    {
      title: "3. Παραχώρηση Άδειας Χρήσης",
      paragraphs: [
        "Ο Δικαιοπάροχος παραχωρεί στον Κάτοχο Άδειας μη αποκλειστικό, μη μεταβιβάσιμο δικαίωμα χρήσης του Λογισμικού για τις εσωτερικές επιχειρηματικές του ανάγκες, αποκλειστικά για τον αριθμό σειράς που αναγράφεται ανωτέρω.",
        "Η Άδεια δεν συνεπάγεται μεταβίβαση κυριότητας επί του Λογισμικού· παραχωρείται μόνο δικαίωμα χρήσης υπό τους παρόντες όρους.",
      ],
    },
    {
      title: "4. Περιορισμοί Χρήσης",
      paragraphs: [
        "Απαγορεύεται η αντιγραφή, αναπαραγωγή, διανομή, εκμίσθωση, παραχώρηση σε τρίτους, αποσυμπίληση (decompilation), ανάστροφη μηχανίκευση (reverse engineering) ή τροποποίηση του Λογισμικού, πέραν των ρητά επιτρεπομένων από την κείμενη νομοθεσία.",
        "Ο Κάτοχος Άδειας υποχρεούται να μην αφαιρεί ή αλλοιώνει ενδείξεις πνευματικής ιδιοκτησίας ή τον αριθμό σειράς.",
      ],
    },
    {
      title: "5. Πνευματικά Δικαιώματα",
      paragraphs: [
        "Το Λογισμικό και κάθε δικαίωμα πνευματικής ιδιοκτησίας επ’ αυτού ανήκουν αποκλειστικά στον Δικαιοπάροχο και προστατεύονται από την ελληνική και ευρωπαϊκή νομοθεσία περί πνευματικής ιδιοκτησίας.",
      ],
    },
    {
      title: "6. Διάρκεια & Λύση",
      paragraphs: [
        "Η Άδεια ισχύει για όσο διάστημα ο Κάτοχος Άδειας συμμορφώνεται με τους παρόντες όρους.",
        "Σε περίπτωση ουσιώδους παράβασης, ο Δικαιοπάροχος δύναται να καταγγείλει την Άδεια· με τη λύση, ο Κάτοχος Άδειας οφείλει να παύσει κάθε χρήση του Λογισμικού.",
      ],
    },
    {
      title: "7. Εγγύηση & Περιορισμός Ευθύνης",
      paragraphs: [
        "Το Λογισμικό παρέχεται «ως έχει» (as is). Στο μέγιστο βαθμό που επιτρέπει ο νόμος, ο Δικαιοπάροχος δεν φέρει ευθύνη για έμμεσες, αποθετικές ή παρεπόμενες ζημίες που τυχόν προκύψουν από τη χρήση ή αδυναμία χρήσης του Λογισμικού.",
      ],
    },
    {
      title: "8. Προστασία Δεδομένων (GDPR)",
      paragraphs: [
        "Η επεξεργασία δεδομένων προσωπικού χαρακτήρα μέσω του Λογισμικού διενεργείται σύμφωνα με τον Κανονισμό (ΕΕ) 2016/679 (GDPR) και την ελληνική νομοθεσία.",
        "Ο Κάτοχος Άδειας ενεργεί ως Υπεύθυνος Επεξεργασίας για τα δεδομένα που εισάγει· ο Δικαιοπάροχος, όπου παρέχει υπηρεσίες υποστήριξης, ενεργεί ως Εκτελών την Επεξεργασία βάσει χωριστής σύμβασης (DPA).",
      ],
    },
    {
      title: "9. Εφαρμοστέο Δίκαιο & Δικαιοδοσία",
      paragraphs: [
        "Η παρούσα Άδεια διέπεται από το ελληνικό δίκαιο. Για κάθε διαφορά αρμόδια ορίζονται τα δικαστήρια της έδρας του Δικαιοπαρόχου.",
      ],
    },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/license-text.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/license-text.ts src/lib/license-text.test.ts
git commit -m "feat(license): add license text builder with unit tests"
```

---

## Task 2: Prisma schema — License model + isSuperAdmin

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `isSuperAdmin` to the User model**

In `prisma/schema.prisma`, in `model User`, add the field directly after the `isActive` line:

```prisma
  isActive      Boolean   @default(true)
  isSuperAdmin  Boolean   @default(false)
```

- [ ] **Step 2: Add the License singleton model**

In `prisma/schema.prisma`, immediately after the closing brace of the `Organization` model (the singleton block), add:

```prisma
// ─── License (singleton) ──────────────────────────────────────────────────────

model License {
  id           String   @id @default(cuid())
  serialNumber String?
  sellerName   String?
  sellerVat    String?
  buyerName    String?
  buyerVat     String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

- [ ] **Step 3: Push schema to DB and regenerate client**

> Per project DB strategy: use `db push`, NEVER `migrate dev` (remote DB history is out of sync — data-loss risk).

Run: `npx prisma db push`
Expected: "Your database is now in sync with your Prisma schema." and "Generated Prisma Client".

Then (defensive): `npx prisma generate`
Expected: "Generated Prisma Client".

- [ ] **Step 4: Verify the client typings exist**

Run: `npx tsc --noEmit`
Expected: No new errors. (`prisma.license` and `User.isSuperAdmin` now type-check.)

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(license): add License singleton model and User.isSuperAdmin"
```

---

## Task 3: Server actions — getLicense / updateLicense

**Files:**
- Create: `src/actions/license.ts`

- [ ] **Step 1: Write the server actions file**

Create `src/actions/license.ts` (mirrors `src/actions/organization.ts`):

```ts
"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAction } from "@/lib/action-logger";
import { revalidatePath } from "next/cache";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Μη εξουσιοδοτημένος");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isSuperAdmin: true },
  });
  if (!user?.isSuperAdmin) throw new Error("Απαιτείται δικαίωμα Υπερδιαχειριστή");
  return session.user.id;
}

/** Any logged-in user may read the license (read-only display). */
export async function getLicense() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Μη εξουσιοδοτημένος");
  return prisma.license.findFirst({ orderBy: { createdAt: "asc" } });
}

export async function updateLicense(formData: FormData) {
  await requireSuperAdmin();

  const str = (k: string) => ((formData.get(k) as string) || "").trim() || null;

  const data = {
    serialNumber: str("serialNumber"),
    sellerName: str("sellerName"),
    sellerVat: str("sellerVat"),
    buyerName: str("buyerName"),
    buyerVat: str("buyerVat"),
  };

  const existing = await prisma.license.findFirst();
  const saved = existing
    ? await prisma.license.update({ where: { id: existing.id }, data })
    : await prisma.license.create({ data });

  await logAction({ action: existing ? "UPDATE" : "CREATE", entity: "License", entityId: saved.id });
  revalidatePath("/settings");
  return { success: true };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/actions/license.ts
git commit -m "feat(license): add getLicense/updateLicense server actions"
```

---

## Task 4: License editor + settings page integration

**Files:**
- Create: `src/components/modules/license-editor.tsx`
- Modify: `src/app/(app)/settings/page.tsx`

- [ ] **Step 1: Create the editor client component**

Create `src/components/modules/license-editor.tsx` (mirrors the form pattern in `profile-editor.tsx`):

```tsx
"use client";

import { useState, useTransition } from "react";
import { updateLicense } from "@/actions/license";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FiSave } from "react-icons/fi";

export interface LicenseData {
  serialNumber: string | null;
  sellerName: string | null;
  sellerVat: string | null;
  buyerName: string | null;
  buyerVat: string | null;
}

export function LicenseEditor({ license }: { license: LicenseData | null }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = (formData: FormData) => {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        await updateLicense(formData);
        setSuccess(true);
      } catch (err: any) {
        setError(err.message ?? "Σφάλμα αποθήκευσης");
      }
    });
  };

  return (
    <form action={handleSave} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Serial Number</label>
        <Input name="serialNumber" defaultValue={license?.serialNumber ?? ""} placeholder="π.χ. DG-2026-0001" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Πωλήτρια — Επωνυμία</label>
          <Input name="sellerName" defaultValue={license?.sellerName ?? ""} placeholder="Επωνυμία" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Πωλήτρια — ΑΦΜ</label>
          <Input name="sellerVat" defaultValue={license?.sellerVat ?? ""} placeholder="ΑΦΜ" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Αγοράστρια — Επωνυμία</label>
          <Input name="buyerName" defaultValue={license?.buyerName ?? ""} placeholder="Επωνυμία" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Αγοράστρια — ΑΦΜ</label>
          <Input name="buyerVat" defaultValue={license?.buyerVat ?? ""} placeholder="ΑΦΜ" />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">✓ Αποθηκεύτηκε</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} className="gap-1.5">
          <FiSave className="h-3.5 w-3.5" /> {isPending ? "Αποθήκευση..." : "Αποθήκευση"}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Add imports to the settings page**

In `src/app/(app)/settings/page.tsx`, add to the existing import block (the lucide-react import already pulls `Shield, Building2, GraduationCap, ChevronRight` — add `KeyRound`):

```tsx
import { Shield, Building2, GraduationCap, ChevronRight, KeyRound } from "lucide-react";
import { getLicense } from "@/actions/license";
import { LicenseEditor } from "@/components/modules/license-editor";
```

- [ ] **Step 3: Select `isSuperAdmin` and fetch the license**

In `src/app/(app)/settings/page.tsx`, add `isSuperAdmin: true` to the `select` of the `prisma.user.findUnique` call (after the `role: true` line):

```tsx
      role: true,
      isSuperAdmin: true,
      phone: true,
```

Then, immediately after the `if (!user) return null;` line, add:

```tsx
  const license = user.isSuperAdmin ? await getLicense() : null;
```

- [ ] **Step 4: Render the editor card (super-admin only)**

In `src/app/(app)/settings/page.tsx`, inside the `<div className="max-w-2xl space-y-6">`, immediately after the Profile `</Card>` (the first card, the one containing `ProfileEditor`), insert:

```tsx
          {/* License config — super-admin only */}
          {user.isSuperAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <KeyRound className="h-4 w-4 text-primary" /> Άδεια Χρήσης Εφαρμογής
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LicenseEditor license={license} />
              </CardContent>
            </Card>
          )}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/modules/license-editor.tsx "src/app/(app)/settings/page.tsx"
git commit -m "feat(license): super-admin license editor card in settings"
```

---

## Task 5: License modal + sidebar link

**Files:**
- Create: `src/components/modules/license-modal.tsx`
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Create the modal client component**

Create `src/components/modules/license-modal.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { getLicense } from "@/actions/license";
import { buildLicenseSections, type LicenseSection } from "@/lib/license-text";

export function LicenseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [sections, setSections] = useState<LicenseSection[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    getLicense()
      .then((lic) => {
        if (cancelled) return;
        setSections(
          buildLicenseSections({
            serialNumber: lic?.serialNumber ?? null,
            sellerName: lic?.sellerName ?? null,
            sellerVat: lic?.sellerVat ?? null,
            buyerName: lic?.buyerName ?? null,
            buyerVat: lic?.buyerVat ?? null,
          })
        );
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Άδεια Χρήσης Λογισμικού"
      description="Όροι άδειας χρήσης της εφαρμογής"
      size="xl"
    >
      {loading || !sections ? (
        <p className="text-sm text-muted-foreground">Φόρτωση…</p>
      ) : (
        <div className="space-y-5 text-sm leading-relaxed">
          {sections.map((s, i) => (
            <section key={i}>
              <h3 className="font-semibold mb-1.5">{s.title}</h3>
              {s.paragraphs.map((p, j) => (
                <p key={j} className="text-muted-foreground mb-1.5">{p}</p>
              ))}
            </section>
          ))}
        </div>
      )}
    </Modal>
  );
}
```

- [ ] **Step 2: Add imports to the sidebar**

In `src/components/layout/sidebar.tsx`, add `MdGavel` to the existing `react-icons/md` import list, and import the modal:

```tsx
import {
  MdDashboard, MdCode, MdPhone, MdHub, MdDescription, MdSchool,
  MdBarChart, MdArticle, MdSettings, MdSecurity, MdFactCheck,
  MdPersonOff, MdVerifiedUser, MdBusiness, MdWork, MdGroup,
  MdLibraryBooks, MdHandshake, MdDeviceHub, MdMenu, MdClose,
  MdChevronLeft, MdChevronRight, MdExpandMore, MdExpandLess,
  MdVpnKey, MdAssignment, MdMenuBook, MdGavel,
} from "react-icons/md";
import { LicenseModal } from "@/components/modules/license-modal";
```

- [ ] **Step 3: Make `NavItem.href` optional and add an action flag**

In `src/components/layout/sidebar.tsx`, change the `NavItem` type to:

```tsx
type NavItem = { label: string; href?: string; action?: "license"; icon: React.ComponentType<{ className?: string; size?: number; style?: any }> };
```

- [ ] **Step 4: Add the license item to the "operations" group**

In `src/components/layout/sidebar.tsx`, in the `operations` group `items` array, add as the last entry (after the "Αρχείο Ελέγχου" item):

```tsx
      { label: "Άδεια Χρήσης", action: "license", icon: MdGavel },
```

- [ ] **Step 5: Add modal state to NavContent**

In `src/components/layout/sidebar.tsx`, inside `function NavContent(...)`, add a state hook next to the existing `expanded` state:

```tsx
  const [licenseOpen, setLicenseOpen] = useState(false);
```

- [ ] **Step 6: Branch the item rendering on `action`**

In `src/components/layout/sidebar.tsx`, replace the entire `{group.items.map((item) => { ... })}` block (the `<li>` mapping inside the `<ul>`) with the version below. It renders an action item as a `<button>` and a normal item as a `<Link>`:

```tsx
                  {group.items.map((item) => {
                    const active = item.href
                      ? pathname === item.href || pathname.startsWith(item.href + "/")
                      : false;

                    if (item.action === "license") {
                      return (
                        <li key={item.label} className="relative">
                          <button
                            onClick={() => { setLicenseOpen(true); onLinkClick?.(); }}
                            className="flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[13px] transition-colors duration-100 w-full font-normal text-left"
                            style={{ color: "rgb(var(--sidebar-foreground))" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgb(var(--sidebar-muted))"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                            title={collapsed ? item.label : undefined}
                          >
                            <item.icon size={17} className="shrink-0" style={{ color: "rgb(var(--muted-foreground))" }} />
                            {!collapsed && <span className="truncate">{item.label}</span>}
                          </button>
                        </li>
                      );
                    }

                    return (
                      <li key={item.href} className="relative">
                        {active && (
                          <span className="absolute left-0 top-0 bottom-0 rounded-r-sm" style={{ width: 3, background: "rgb(0,120,212)" }} />
                        )}
                        <Link
                          href={item.href!}
                          onClick={onLinkClick}
                          className={cn("flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[13px] transition-colors duration-100 w-full", active ? "font-medium" : "font-normal")}
                          style={{
                            color: active ? "rgb(0,120,212)" : "rgb(var(--sidebar-foreground))",
                            background: active ? "rgba(0,120,212,0.08)" : undefined,
                            paddingLeft: active ? 14 : undefined,
                          }}
                          onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgb(var(--sidebar-muted))"; }}
                          onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = ""; }}
                          title={collapsed ? item.label : undefined}
                        >
                          <item.icon
                            size={17}
                            className="shrink-0"
                            style={{ color: active ? "rgb(0,120,212)" : "rgb(var(--muted-foreground))" }}
                          />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </Link>
                      </li>
                    );
                  })}
```

- [ ] **Step 7: Render the modal at the end of NavContent**

In `src/components/layout/sidebar.tsx`, in `NavContent`, just before the final closing `</div>` of the returned `<div className="flex flex-col h-full">`, add:

```tsx
      <LicenseModal open={licenseOpen} onClose={() => setLicenseOpen(false)} />
```

- [ ] **Step 8: Guard the auto-expand effect against action-only items**

In `src/components/layout/sidebar.tsx`, the `useEffect` that auto-expands the group containing the current path uses `item.href`. Confirm it still compiles with optional href by updating its predicate to:

```tsx
      if (g.items.some((item) => item.href && (pathname === item.href || pathname.startsWith(item.href + "/")))) {
```

(Also update the `hasActive` computation in the render — `group.items.some((item) => item.href && (pathname === item.href || pathname.startsWith(item.href + "/")))` — wherever `item.href` is used without a guard.)

- [ ] **Step 9: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 10: Commit**

```bash
git add src/components/modules/license-modal.tsx src/components/layout/sidebar.tsx
git commit -m "feat(license): add 'Άδεια Χρήσης' sidebar link and license modal"
```

---

## Task 6: Final verification

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: All tests pass (including `license-text.test.ts`).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: Build succeeds with no type errors. (`prisma generate` runs first via the build script.)

- [ ] **Step 3: Manual smoke test (dev)**

Run: `npm run dev`, then:
1. Log in as a normal user → sidebar "Λειτουργίες" shows "Άδεια Χρήσης" → click → modal opens with the EULA text (fields show "—" until configured). Settings page shows NO license card.
2. In DB, set a user's `isSuperAdmin = true` (e.g. `UPDATE User SET isSuperAdmin = 1 WHERE email = '<your-email>';`). Re-login → Settings shows "Άδεια Χρήσης Εφαρμογής" card → fill serial + companies → Save → "✓ Αποθηκεύτηκε".
3. Reopen the sidebar modal → values now appear in section "1. Στοιχεία Άδειας".

Expected: All three behave as described.

- [ ] **Step 4: Final commit (if any uncommitted changes remain)**

```bash
git status
# if clean, nothing to do
```

---

## Self-Review Notes

- **Spec coverage:** Singleton `License` model (Task 2) ✓; `isSuperAdmin` (Task 2) ✓; `getLicense`/`updateLicense` with `requireSuperAdmin` (Task 3) ✓; settings super-admin card (Task 4) ✓; sidebar link + modal for all users (Task 5) ✓; Greek EULA text builder (Task 1) ✓.
- **Type consistency:** `LicenseInfo` (license-text.ts) and `LicenseData` (license-editor.tsx) share the same five nullable string fields; `buildLicenseSections` consumes `LicenseInfo` in both the test and the modal. `getLicense()` returns the Prisma `License | null`; the modal maps it field-by-field to `LicenseInfo`.
- **Out of scope (per spec):** version history, multiple installations, UI to assign `isSuperAdmin`, PDF export.
```
