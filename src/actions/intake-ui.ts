// src/actions/intake-ui.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId, requireAdmin } from "@/lib/current-user";
import { logAction } from "@/lib/action-logger";
import { revalidatePath } from "next/cache";
import { ExtractionSchema, type Extraction } from "@/lib/intake/schemas";
import { normalizeVat, isValidGreekVat } from "@/lib/intake/vat";

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

/**
 * Δημιουργεί εταιρία από τα στοιχεία που εξήγαγε ο αγωγός και την προσθέτει
 * αμέσως ως μέρος.
 *
 * Ο χρήστης έχει ήδη μπροστά του το έγγραφο· το να σταλεί στη διαχείριση
 * εταιριών για να ξαναπληκτρολογήσει όσα μόλις διαβάστηκαν είναι σπατάλη και
 * πηγή λαθών. Η ταξινόμηση (πελάτης, προμηθευτής, συνεργάτης) κρατά την
 * εταιρία χρήσιμη και για τις επόμενες συνεργασίες.
 */
export async function createCompanyForIntake(
  intakeId: string,
  input: {
    name: string;
    legalName?: string | null;
    vatNumber?: string | null;
    taxOffice?: string | null;
    addressLine1?: string | null;
    postalCode?: string | null;
    city?: string | null;
    contactEmail?: string | null;
  },
  relationships: string[],
  side: "OWN_MOTHER" | "OWN_GROUP" | "EXTERNAL",
  /**
   * Όταν η δημιουργία ξεκινά από μέρος που εξήχθη αλλά δεν ταίριαξε, το
   * υπάρχον `IntakeParty` συνδέεται με τη νέα εταιρία αντί να προστεθεί
   * δεύτερη γραμμή για την ίδια οντότητα.
   */
  partyId?: string
): Promise<{ companyId: string; created: boolean }> {
  await requireAdmin();

  let existingParty: { id: string; intakeId: string; companyId: string | null } | null = null;
  if (partyId) {
    existingParty = await prisma.intakeParty.findUnique({
      where: { id: partyId },
      select: { id: true, intakeId: true, companyId: true },
    });
    if (!existingParty || existingParty.intakeId !== intakeId) {
      throw new Error("Το μέρος δεν ανήκει σε αυτή την πρόσληψη");
    }
    if (existingParty.companyId !== null) {
      throw new Error("Το μέρος έχει ήδη συνδεθεί με εταιρία");
    }
  }

  const name = input.name?.trim();
  if (!name) throw new Error("Απαιτείται επωνυμία εταιρίας");

  // Ένα ΑΦΜ που δεν περνάει το ψηφίο ελέγχου γίνεται λάθος κλειδί
  // αντιστοίχισης για πάντα — καλύτερα να απορριφθεί εδώ παρά να αποθηκευτεί.
  const rawVat = input.vatNumber?.trim();
  const normalizedVat = normalizeVat(rawVat);
  if (rawVat && !normalizedVat) {
    throw new Error(`Το ΑΦΜ «${rawVat}» δεν έχει έγκυρη μορφή`);
  }
  if (normalizedVat && !isValidGreekVat(normalizedVat)) {
    throw new Error(`Το ΑΦΜ «${normalizedVat}» δεν είναι έγκυρο — ελέγξτε το ψηφίο ελέγχου`);
  }

  let companyId: string;
  let created: boolean;

  const existing = normalizedVat
    ? await prisma.company.findUnique({ where: { vatNumber: normalizedVat } })
    : null;

  if (existing) {
    companyId = existing.id;
    created = false;
  } else {
    const company = await prisma.company.create({
      data: {
        name,
        legalName: input.legalName || null,
        vatNumber: normalizedVat,
        taxOffice: input.taxOffice || null,
        addressLine1: input.addressLine1 || null,
        postalCode: input.postalCode || null,
        city: input.city || null,
        contactEmail: input.contactEmail || null,
        relationships: relationships as never,
      },
    });
    companyId = company.id;
    created = true;

    await logAction({
      action: "CREATE",
      entity: "Company",
      entityId: company.id,
      details: { source: "intake", intakeId, relationships },
    });
  }

  if (existingParty) {
    // Το μέρος υπήρχε ήδη — απλώς δεν είχε ταιριάξει με εταιρία. Συνδέουμε
    // τη νέα εταιρία σε αυτό αντί να προσθέσουμε δεύτερη γραμμή για την ίδια
    // οντότητα· τα extracted πεδία μένουν άθικτα, δείχνουν τι έλεγε το
    // έγγραφο, ενώ η σύνδεση δείχνει τι αποφάσισε ο άνθρωπος.
    await prisma.intakeParty.update({
      where: { id: existingParty.id },
      data: {
        companyId,
        side: side as never,
        matchMethod: "MANUAL" as never,
        matchScore: null,
      },
    });

    await logAction({
      action: "UPDATE",
      entity: "IntakeParty",
      entityId: existingParty.id,
      details: { companyId, side, source: "created-from-document" },
    });
  } else {
    // Η προσθήκη ως μέρος περνάει από την ίδια λογική με την επιλογή υπάρχουσας
    // εταιρίας — δεν εφευρίσκουμε δεύτερο δρόμο δημιουργίας IntakeParty.
    await addPartyManually(intakeId, companyId, side);
  }

  revalidatePath(`/intake/${intakeId}`);
  revalidatePath("/admin/companies");

  return { companyId, created };
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
