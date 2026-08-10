import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { deepseekChat } from "@/lib/deepseek";
import type { ComplianceProfile } from "@/lib/intake/compliance-profile";
import type { Remedy } from "./types";
import { inferPolicyType } from "./policy-type";

/**
 * `CREATE_POLICY`: το `gap.policyType` λέει ποια πολιτική λείπει. Το
 * περιεχόμενο έρχεται από το DeepSeek, τροφοδοτημένο με τα πραγματικά
 * στοιχεία του οργανισμού (όχι της συνεργασίας — οι πολιτικές είναι
 * οργανωτικές, όχι ανά σύμβαση).
 */

const POLICY_LABELS: Record<string, string> = {
  SECURITY_POLICY: "Πολιτική Ασφάλειας Πληροφοριών",
  ACCEPTABLE_USE: "Πολιτική Αποδεκτής Χρήσης",
  DATA_RETENTION: "Πολιτική Διατήρησης Δεδομένων",
  INCIDENT_RESPONSE: "Πολιτική Αντιμετώπισης Περιστατικών",
  BYOD: "Πολιτική BYOD (Bring Your Own Device)",
  PASSWORD_POLICY: "Πολιτική Κωδικών Πρόσβασης",
  BACKUP: "Πολιτική Αντιγράφων Ασφαλείας",
  ACCESS_CONTROL: "Πολιτική Ελέγχου Πρόσβασης",
  PRIVACY_NOTICE: "Ενημέρωση Απορρήτου (Privacy Notice)",
  COOKIE_POLICY: "Πολιτική Cookies",
  DATA_BREACH: "Πολιτική Παραβίασης Δεδομένων",
  EMPLOYEE_HANDBOOK: "Εγχειρίδιο Εργαζομένων",
  ETHICS_CODE: "Κώδικας Δεοντολογίας",
  CLEAR_DESK: "Πολιτική Τακτοποιημένου Χώρου Εργασίας",
  REMOTE_WORK: "Πολιτική Τηλεργασίας",
  VENDOR_MANAGEMENT: "Πολιτική Διαχείρισης Προμηθευτών",
  CHANGE_MANAGEMENT: "Πολιτική Διαχείρισης Αλλαγών",
  BUSINESS_CONTINUITY: "Πολιτική Επιχειρησιακής Συνέχειας",
  OTHER: "Πολιτική",
};

// Επικύρωση με Zod ακόμη κι όταν η απάντηση δεν είναι JSON: το «σχήμα» ενός
// κειμένου πολιτικής είναι «αρκετά μεγάλο ώστε να μην είναι σφάλμα/κενό».
const PolicyContentSchema = z
  .string()
  .trim()
  .min(200, "Το περιεχόμενο πολιτικής που επέστρεψε το μοντέλο είναι πολύ μικρό για να είναι έγκυρο.");

function buildOrgContext(profile: ComplianceProfile): string {
  const lines: string[] = [];
  if (profile.mother.name && profile.mother.name !== "—") lines.push(`Επωνυμία: ${profile.mother.name}`);
  if (profile.mother.vatNumber) lines.push(`ΑΦΜ: ${profile.mother.vatNumber}`);
  if (profile.mother.domains.length) lines.push(`Domains: ${profile.mother.domains.join(", ")}`);
  if (profile.subsidiaries.length) {
    lines.push(`Θυγατρικές εταιρίες ομίλου: ${profile.subsidiaries.map((s) => s.name).join(", ")}`);
  }
  return lines.length ? `\n\nΣτοιχεία οργανισμού:\n${lines.join("\n")}` : "";
}

async function generatePolicyContent(typeName: string, profile: ComplianceProfile): Promise<string> {
  const system =
    "Είσαι νομικός και τεχνικός σύμβουλος GDPR για ελληνικές εταιρείες. " +
    "Γράφεις επίσημα εταιρικά έγγραφα πολιτικής σε επαγγελματικό επίπεδο, στα ελληνικά. " +
    "Επιστρέφεις ΜΟΝΟ HTML (χωρίς markdown, χωρίς code blocks, χωρίς εξηγήσεις). " +
    "Χρησιμοποίησε tags: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>, <hr>.";

  const user = `Γράψε μια πλήρη και λεπτομερή «${typeName}» για την παρακάτω εταιρεία.${buildOrgContext(profile)}

Η πολιτική πρέπει:
- Να αναφέρει ρητά το όνομα της εταιρείας στην κεφαλίδα και όπου αρμόζει
- Να είναι συμμορφωμένη με τον GDPR και την ελληνική νομοθεσία
- Να περιλαμβάνει: Σκοπό, Πεδίο Εφαρμογής, Ορισμούς, Βασικές Αρχές/Κανόνες, Υποχρεώσεις, Παραβιάσεις & Συνέπειες, Αναθεώρηση Πολιτικής
- Να χρησιμοποιεί επαγγελματική γλώσσα κατάλληλη για εταιρικό έγγραφο
- Να αναφέρει σχετικά άρθρα GDPR όπου είναι εφαρμόσιμο

Επίστρεψε ΜΟΝΟ το HTML του περιεχομένου, χωρίς άλλο κείμενο.`;

  const raw = await deepseekChat({ system, user, temperature: 0.3, maxTokens: 4000 });
  const clean = raw.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "").trim();
  return PolicyContentSchema.parse(clean);
}

export const createPolicy: Remedy = async (gap, ctx) => {
  // Το μοντέλο συχνά παραλείπει το policyType — είναι ένα πεδίο μέσα σε μεγάλη
  // δομή JSON. Το συμπεραίνουμε από το κείμενο του κενού, που πάντα λέει ποια
  // πολιτική λείπει. Η τιμή του μοντέλου, όταν υπάρχει, υπερισχύει.
  const policyType =
    gap.policyType ?? inferPolicyType(`${gap.title} ${gap.description}`);

  if (!policyType) {
    return { status: "SKIPPED", reason: "Δεν προκύπτει ποια πολιτική λείπει." };
  }

  const typeName = POLICY_LABELS[policyType] ?? policyType;

  const existing = await prisma.policyDocument.findFirst({
    where: { type: policyType, status: "ACTIVE" },
    select: { id: true },
  });
  if (existing) {
    return { status: "SKIPPED", reason: `Υπάρχει ήδη ενεργή πολιτική τύπου «${typeName}».` };
  }

  const content = await generatePolicyContent(typeName, ctx.profile);

  const doc = await prisma.policyDocument.create({
    data: {
      title: typeName,
      type: policyType,
      version: "1.0",
      content,
      status: "DRAFT",
    },
  });

  return {
    status: "CREATED",
    entityType: "PolicyDocument",
    entityId: doc.id,
    label: typeName,
  };
};
