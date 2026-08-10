import type { IntakeGap } from "@prisma/client";
import type { Remedy, RemedyContext, RemedyResult } from "./types";
import { createDpa, createContractClauses, createJca } from "./dpa";
import { createDpia } from "./dpia";
import { createPolicy } from "./policy";
import { assignDpo, createTraining, createRopaEntry, createAssessment } from "./manual";

/**
 * Ένας εκτελεστής ανά `RemedyType`. Το test πληρότητας παρακάτω διαβάζει το
 * enum απευθείας από το Prisma Client, όχι μια δική μας λίστα — έτσι ένας
 * δέκατος τύπος χωρίς εκτελεστή σπάει το test αντί να το ανακαλύψει ο χρήστης.
 */
const REGISTRY: Record<string, Remedy> = {
  CREATE_DPA: createDpa,
  CREATE_CONTRACT_CLAUSES: createContractClauses,
  CREATE_JCA: createJca,
  CREATE_DPIA: createDpia,
  CREATE_POLICY: createPolicy,
  CREATE_ROPA_ENTRY: createRopaEntry,
  CREATE_ASSESSMENT: createAssessment,
  ASSIGN_DPO: assignDpo,
  CREATE_TRAINING: createTraining,
};

export const REGISTRY_KEYS = Object.keys(REGISTRY);

export async function executeRemedy(gap: IntakeGap, ctx: RemedyContext): Promise<RemedyResult> {
  if (!gap.remedyType) return { status: "SKIPPED", reason: "Το κενό δεν έχει προτεινόμενη κάλυψη." };
  // Ιδιοτροπία: ο χρήστης ΘΑ πατήσει «Κάλυψη όλων» δεύτερη φορά.
  if (gap.createdEntityId) return { status: "SKIPPED", reason: "Έχει ήδη καλυφθεί." };
  const remedy = REGISTRY[gap.remedyType];
  if (!remedy) return { status: "SKIPPED", reason: `Άγνωστος τύπος κάλυψης: ${gap.remedyType}` };
  return remedy(gap, ctx);
}
