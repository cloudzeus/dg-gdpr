// src/actions/intake-ui.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";
import { logAction } from "@/lib/action-logger";
import { revalidatePath } from "next/cache";
import { ExtractionSchema, type Extraction } from "@/lib/intake/schemas";

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
