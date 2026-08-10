import type { AssessmentType, GapCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Remedy } from "./types";

/**
 * Τέσσερις εκτελεστές που δεν παράγουν τίποτα αυτόματα — και δεν προσποιούνται
 * ότι το κάνουν. Ο ορισμός ΥΠΔ και η εγγραφή σε εκπαίδευση είναι αποφάσεις για
 * συγκεκριμένα πρόσωπα· ένα εργαλείο που τις παρίστανε ως «έγιναν» θα έλεγε
 * ψέματα ακριβώς εκεί που ένα εργαλείο συμμόρφωσης δεν επιτρέπεται.
 */

export const assignDpo: Remedy = async () => ({
  status: "NEEDS_HUMAN",
  reason:
    "Ο ορισμός Υπευθύνου Προστασίας Δεδομένων είναι διορισμός προσώπου με ευθύνη έναντι της Αρχής — δεν γίνεται αυτόματα.",
  href: "/admin/positions",
});

export const createTraining: Remedy = async () => ({
  status: "NEEDS_HUMAN",
  reason: "Η εκπαίδευση απαιτεί να οριστεί ποιοι εργαζόμενοι θα τη λάβουν.",
  href: "/admin/training",
});

export const createRopaEntry: Remedy = async () => ({
  status: "NEEDS_HUMAN",
  reason: "Η καταχώριση RoPA χρειάζεται να δηλωθεί σε ποιο τμήμα ανήκει η δραστηριότητα.",
  href: "/mapper",
});

const ASSESSMENT_TYPE_BY_CATEGORY: Partial<Record<GapCategory, AssessmentType>> = {
  DPIA: "DPIA",
  TECHNICAL: "SECURITY_AUDIT",
};

function assessmentTypeFor(category: GapCategory): AssessmentType {
  return ASSESSMENT_TYPE_BY_CATEGORY[category] ?? "PRIVACY_BY_DESIGN";
}

/**
 * Η μόνη από τις τέσσερις που αγγίζει τη βάση: δημιουργεί την `Assessment` —
 * η οντότητα υπάρχει, μόνο οι απαντήσεις λείπουν. Το id αποθηκεύεται στο
 * `remedyPayload` (όπως το CREATE_ROPA_ENTRY) γιατί το αποτέλεσμα είναι
 * `NEEDS_HUMAN`, όχι `CREATED` — το γενικό `createdEntityId` δεν γράφεται από
 * την ενέργεια για τέτοια αποτελέσματα, οπότε χωρίς αυτό ο χρήστης θα
 * δημιουργούσε δεύτερη `Assessment` στο επόμενο «Κάλυψη όλων».
 */
export const createAssessment: Remedy = async (gap, ctx) => {
  const payload = (gap.remedyPayload as { assessmentId?: string } | null) ?? null;
  if (payload?.assessmentId) {
    return { status: "SKIPPED", reason: "Έχει ήδη καλυφθεί." };
  }

  if (!ctx.projectId) {
    return { status: "SKIPPED", reason: "Το έργο δημιουργείται στο βήμα 6 — η αξιολόγηση θα δημιουργηθεί μετά." };
  }

  const assessment = await prisma.assessment.create({
    data: {
      projectId: ctx.projectId,
      type: assessmentTypeFor(gap.category),
      title: `Αξιολόγηση — ${gap.title}`,
      answers: {},
      status: "DRAFT",
    },
  });

  await prisma.intakeGap.update({
    where: { id: gap.id },
    data: { remedyPayload: { assessmentId: assessment.id } as never },
  });

  return {
    status: "NEEDS_HUMAN",
    reason: `Η αξιολόγηση δημιουργήθηκε (id: ${assessment.id})· οι απαντήσεις δίνονται από άνθρωπο.`,
    href: "/assessment",
  };
};
