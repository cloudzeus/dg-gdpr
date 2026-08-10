// src/app/(app)/intake/[id]/step-parties.tsx
import { prisma } from "@/lib/prisma";
import { listCompanies } from "@/actions/companies";
import { normalizeCompanyName } from "@/lib/intake/company-match";
import { getAdminUser } from "@/lib/current-user";
import { PartiesClient } from "./parties-client";
import type { getIntakeDetail } from "@/actions/intake-ui";
import type { Extraction } from "@/lib/intake/schemas";

type Intake = Awaited<ReturnType<typeof getIntakeDetail>>["intake"];
type Company = Awaited<ReturnType<typeof listCompanies>>[number];

/**
 * Βρίσκει εταιρία της βάσης που «μοιάζει» με ένα όνομα (αποδέκτης προσφοράς
 * ή ο οργανισμός) — επαναχρησιμοποιεί την ίδια κανονικοποίηση ονόματος με
 * την αντιστοίχιση μερών, δεν εφευρίσκει νέα λογική ταιριάσματος.
 */
function findResemblingCompany(companies: Company[], hint: string | null | undefined): Company | null {
  const key = normalizeCompanyName(hint);
  if (!key) return null;

  const exact = companies.find(
    (c) => normalizeCompanyName(c.name) === key || normalizeCompanyName(c.legalName) === key
  );
  if (exact) return exact;

  // Χαλαρότερο ταίριασμα — «μοιάζει», όχι ταυτίζεται· το OCR/AI δεν βγάζει
  // πάντα ακριβώς την ίδια επωνυμία που έχει η βάση.
  return (
    companies.find((c) => {
      const name = normalizeCompanyName(c.name);
      return name.length > 3 && (name.includes(key) || key.includes(name));
    }) ?? null
  );
}

/** Βήμα 4: η οθόνη αγκύρωσης — μέρη, ρόλοι, ο αντισυμβαλλόμενος και οι προμηθευτές. */
export async function StepParties({ intake, extraction }: { intake: Intake; extraction: Extraction }) {
  const [companies, org, adminUser] = await Promise.all([
    listCompanies(),
    prisma.organization.findFirst({ orderBy: { createdAt: "asc" } }),
    getAdminUser(),
  ]);

  const subsidiaries = companies.filter(
    (c) => Array.isArray(c.relationships) && (c.relationships as string[]).includes("SUBSIDIARY")
  );

  const recipientMatch = findResemblingCompany(companies, extraction.recipientHint);
  const motherMatch = findResemblingCompany(companies, org?.name);

  return (
    <PartiesClient
      intake={intake}
      extraction={extraction}
      companies={companies}
      subsidiaries={subsidiaries}
      recipientMatchId={recipientMatch?.id ?? null}
      orgName={org?.name ?? null}
      orgHasVat={!!org?.vatNumber}
      motherMatchId={motherMatch?.id ?? null}
      motherMatchName={motherMatch?.name ?? null}
      isAdmin={!!adminUser}
    />
  );
}
