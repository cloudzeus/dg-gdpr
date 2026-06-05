# Άδεια Χρήσης Εφαρμογής — Design Spec

**Ημερομηνία:** 2026-06-05
**Project:** dg-gdpr (GDPR Compliance OS)

## Σκοπός

Δύο συνδεδεμένες δυνατότητες γύρω από την άδεια χρήσης του λογισμικού:

1. **Φόρμα ρύθμισης (μόνο υπερδιαχειριστής)** όπου ο πωλητής (DG Smart) ορίζει:
   - Serial number της εγκατάστασης
   - Πωλήτρια εταιρία (επωνυμία + ΑΦΜ)
   - Αγοράστρια εταιρία (επωνυμία + ΑΦΜ)
2. **Link «Άδεια Χρήσης» στο sidebar**, ορατό σε όλους τους συνδεδεμένους χρήστες, που ανοίγει modal με το κείμενο της άδειας (read-only), με τα παραπάνω στοιχεία ενσωματωμένα δυναμικά.

## Αποφάσεις (από brainstorming)

| Θέμα | Απόφαση |
|------|---------|
| Ποιος είναι «υπερδιαχειριστής» | Νέο πεδίο `isSuperAdmin: Boolean` στον `User` (ξεχωριστό από τον ρόλο `ADMIN` του πελάτη) |
| Ποιος βλέπει το link «Άδεια Χρήσης» | Όλοι οι συνδεδεμένοι χρήστες (προβολή read-only) |
| Πού ζει η φόρμα ρύθμισης | Στις Ρυθμίσεις (`/settings`), νέα κάρτα ορατή μόνο στον super-admin |
| Πεδία ανά εταιρία | Επωνυμία + ΑΦΜ |

## Αρχιτεκτονική

### 1. Μοντέλο δεδομένων (Prisma)

Νέο **singleton** model (μοτίβο `Organization`):

```prisma
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

Νέο πεδίο στον `User`:

```prisma
isSuperAdmin Boolean @default(false)
```

**Εφαρμογή schema:** `prisma db push` (ΟΧΙ `migrate dev` — η απομακρυσμένη DB είναι εκτός sync, κίνδυνος απώλειας δεδομένων).

### 2. Server action — `src/actions/license.ts`

Ακολουθεί το μοτίβο του `src/actions/organization.ts`.

- `requireSuperAdmin()` — διαβάζει `user.isSuperAdmin` από τη DB μέσω `session.user.id` (το flag ΔΕΝ είναι στο JWT). Πετάει σφάλμα αν δεν ισχύει.
- `getLicense()` — επιστρέφει το singleton `License` (`findFirst`). Διαβάζεται από οποιονδήποτε συνδεδεμένο.
- `updateLicense(formData)` — `requireSuperAdmin()`, upsert του singleton (create αν δεν υπάρχει, αλλιώς update), `logAction({ action, entity: "License" })`, `revalidatePath("/settings")`.

### 3. Φόρμα ρύθμισης (μόνο super-admin)

- `src/app/(app)/settings/page.tsx`: προσθήκη `isSuperAdmin: true` στο `select` του χρήστη· κλήση `getLicense()`. Αν `user.isSuperAdmin`, render νέας `Card` «Άδεια Χρήσης Εφαρμογής».
- `src/components/modules/license-editor.tsx` (client): φόρμα με πεδία `serialNumber`, `sellerName`, `sellerVat`, `buyerName`, `buyerVat`· υποβολή στο `updateLicense`· μηνύματα επιτυχίας/σφάλματος.

### 4. Link στο sidebar + Modal (όλοι)

- `src/components/layout/sidebar.tsx`: στην ομάδα «Λειτουργίες», νέο item «Άδεια Χρήσης» (εικονίδιο `MdGavel`). Αντί για πλοήγηση (`Link`), λειτουργεί ως κουμπί που ανοίγει modal. Επέκταση του `NavItem` ώστε ένα item να μπορεί να είναι «action» αντί για href.
- `src/components/modules/license-modal.tsx` (client): χρησιμοποιεί το υπάρχον `Modal` (`src/components/ui/modal.tsx`, size `xl`). Στο άνοιγμα καλεί `getLicense()` και εμφανίζει το κείμενο της άδειας. Read-only.

### 5. Κείμενο άδειας — `src/lib/license-text.ts`

`buildLicenseSections(license)` επιστρέφει δομημένες ενότητες (τίτλος + παράγραφοι) στα ελληνικά. Ενότητες:

1. Στοιχεία Άδειας (serial, πωλήτρια, αγοράστρια)
2. Αντικείμενο
3. Παραχώρηση άδειας χρήσης
4. Περιορισμοί χρήσης
5. Πνευματικά δικαιώματα
6. Διάρκεια & Λύση
7. Εγγύηση & Περιορισμός ευθύνης
8. Προστασία δεδομένων (GDPR)
9. Εφαρμοστέο δίκαιο & Δικαιοδοσία

Τα δυναμικά πεδία (serial/εταιρίες) ενσωματώνονται· όπου λείπουν, εμφανίζεται ουδέτερο placeholder (π.χ. «—»).

## Επηρεαζόμενα αρχεία

**Νέα**
- `src/actions/license.ts`
- `src/components/modules/license-editor.tsx`
- `src/components/modules/license-modal.tsx`
- `src/lib/license-text.ts`

**Τροποποίηση**
- `prisma/schema.prisma` (License model + `User.isSuperAdmin`)
- `src/components/layout/sidebar.tsx` (nav item + modal)
- `src/app/(app)/settings/page.tsx` (super-admin κάρτα)

## Σημεία ασφάλειας / σχεδιασμού

- Η εγγραφή της άδειας προστατεύεται από `requireSuperAdmin()` σε επίπεδο server action — όχι μόνο απόκρυψη UI.
- Το `isSuperAdmin` ορίζεται απευθείας στη DB / seed (δεν υπάρχει UI που το αναθέτει — σκόπιμα, ώστε ο ADMIN του πελάτη να μην μπορεί να γίνει super-admin).
- Η προβολή της άδειας είναι read-only για μη super-admins.

## Εκτός σκοπού (YAGNI)

- Ιστορικό εκδόσεων άδειας.
- Πολλαπλές άδειες/εγκαταστάσεις (singleton μόνο).
- UI για ανάθεση του `isSuperAdmin`.
- Ψηφιακή υπογραφή / εξαγωγή PDF της άδειας (μπορεί να προστεθεί αργότερα).
