// src/lib/intake/reasoning.ts
import { deepseekChat } from "@/lib/deepseek";
import { ReasoningSchema, parseAiJson, type Extraction, type Reasoning } from "./schemas";
import type { ComplianceProfile } from "./compliance-profile";

/**
 * Στάδιο ⑦: από γεγονότα σε νομική κρίση.
 *
 * Το DeepSeek δεν βλέπει ποτέ pixel — μόνο τα δομημένα γεγονότα της εξαγωγής
 * και το προφίλ συμμόρφωσης του ομίλου. Έτσι ένα σφάλμα OCR δεν μεταμφιέζεται
 * σε λάθος νομικό συμπέρασμα, και το «γιατί» της κρίσης μένει ελέγξιμο.
 */

const SYSTEM = `Είσαι νομικός σύμβουλος GDPR για ελληνικές εταιρείες λογισμικού και ERP integrators.
Κρίνεις τον ρόλο κάθε συμβαλλόμενου κατά GDPR και εντοπίζεις κενά συμμόρφωσης.
Επιστρέφεις ΜΟΝΟ έγκυρο JSON, χωρίς markdown, χωρίς code blocks, χωρίς εξηγήσεις εκτός JSON.

Δομή:
{
  "partyRoles": [{ "name": "<ακριβώς όπως δόθηκε>", "role": "CONTROLLER|PROCESSOR|JOINT_CONTROLLER|SUB_PROCESSOR|RECIPIENT|THIRD_PARTY", "rationale": "μία-δύο προτάσεις", "gdprArticles": ["28"] }],
  "gaps": [{ "category": "POLICY|DPIA|ROPA|TRAINING|TECHNICAL|CONTRACT|DPO", "severity": "CRITICAL|HIGH|MEDIUM|LOW", "title": "...", "description": "...", "remedyType": "CREATE_POLICY|CREATE_CONTRACT_CLAUSES|CREATE_DPIA|CREATE_DPA|CREATE_JCA|CREATE_ROPA_ENTRY|CREATE_ASSESSMENT|ASSIGN_DPO|CREATE_TRAINING", "policyType": "ACCESS_CONTROL|DATA_BREACH|SECURITY_POLICY|DATA_RETENTION|INCIDENT_RESPONSE|PRIVACY_NOTICE|VENDOR_MANAGEMENT|BACKUP|PASSWORD_POLICY|BUSINESS_CONTINUITY|OTHER", "gdprArticles": ["..."] }]
}

Κανόνες:
- Ο ρόλος κρίνεται ΜΟΝΟ από το ποιος καθορίζει σκοπούς και μέσα (άρθρο 4 παρ. 7-8).
  Δεν έχει σημασία ποιος συντάσσει το έγγραφο ή ποιος πληρώνει ποιον. Μια εταιρεία
  λογισμικού που αναπτύσσει σύστημα κατ' εντολή πελάτη είναι Εκτελών, ακόμη κι αν
  είναι αυτή που έγραψε τη σύμβαση.
- Δώσε ρόλο σε ΚΑΘΕ μέρος του καταλόγου, και σε κανέναν άλλον. Στο "name" γράψε
  ΜΟΝΟ την επωνυμία όπως είναι μέσα στα εισαγωγικά, χωρίς το ΑΦΜ και χωρίς παύλες.
- Οι προμηθευτές ΔΕΝ είναι μέρη. Όσοι επεξεργάζονται δεδομένα είναι υποψήφιοι
  υποεκτελούντες και δικαιολογούν κενό· όσοι απλώς προμηθεύουν εξοπλισμό ΔΕΝ
  δικαιολογούν ούτε κενό ούτε σύμβαση επεξεργασίας.
- Τα κενά αφορούν ΤΗ ΔΙΚΗ ΜΑΣ πλευρά, με βάση το προφίλ συμμόρφωσης — όχι γενικές συμβουλές.
- CRITICAL μόνο όταν η έλλειψη συνιστά παράβαση, π.χ. απουσία DPA όπου απαιτείται άρθρο 28,
  ή απουσία DPIA όπου απαιτείται άρθρο 35.
- Όταν το remedyType είναι CREATE_POLICY, το "policyType" είναι ΥΠΟΧΡΕΩΤΙΚΟ και δηλώνει
  ποια ακριβώς πολιτική λείπει. Χωρίς αυτό δεν μπορεί να δημιουργηθεί τίποτα.
- Μην προτείνεις κενό που ήδη καλύπτεται από το προφίλ.`;

export interface ConfirmedParty {
  name: string;
  vat: string | null;
  side: "OWN_MOTHER" | "OWN_GROUP" | "EXTERNAL";
}

export interface ReasoningDeps {
  chat?: (p: { system: string; user: string; temperature?: number; maxTokens?: number }) => Promise<string>;
}

function buildUserPrompt(
  extraction: Extraction,
  profile: ComplianceProfile,
  parties: ConfirmedParty[]
): string {
  return `ΤΑ ΔΙΚΑ ΜΑΣ ΣΤΟΙΧΕΙΑ (όμιλος)
Μαμά: ${profile.mother.name} — ΑΦΜ ${profile.mother.vatNumber ?? "—"} — domains: ${profile.mother.domains.join(", ") || "—"}
Θυγατρικές: ${profile.subsidiaries.map((s) => `${s.name} (${s.vatNumber ?? "—"})`).join("; ") || "καμία"}

ΚΑΤΑΣΤΑΣΗ ΣΥΜΜΟΡΦΩΣΗΣ
Συνολικό score αξιολόγησης: ${profile.assessment.overall}%
Αδύναμες κατηγορίες: ${profile.assessment.weakCategories.join(", ") || "καμία"}
Ενεργές πολιτικές: ${profile.policies.active.join(", ") || "καμία"}
Πολιτικές που λείπουν: ${profile.policies.missing.join(", ") || "καμία"}
Πολιτικές ληγμένες: ${profile.policies.expired.join(", ") || "καμία"}
RoPA ανά τμήμα: ${profile.ropaDepartments.join(", ") || "καμία καταγραφή"}
Ορισμένος ΥΠΔ/DPO: ${profile.hasDpo ? "ναι" : "όχι"}
Ποσοστό επιτυχίας εκπαίδευσης: ${profile.trainingPassRate === null ? "καμία εκπαίδευση" : `${Math.round(profile.trainingPassRate * 100)}%`}
Γνωστοί υποεκτελούντες: ${profile.knownSubProcessors.join(", ") || "κανένας"}

Η ΣΥΜΒΑΣΗ
Αντικείμενο: ${extraction.subject ?? "—"}
Διάρκεια: ${extraction.term ?? "—"}
Ημερομηνία: ${extraction.signedAt ?? "—"}
Κατηγορίες δεδομένων: ${extraction.dataCategories.join(", ") || "δεν αναφέρονται"}
Διασυνοριακή μεταφορά: ${extraction.crossBorderTransfer ? "ναι" : "όχι"}
Ειδικές κατηγορίες (άρθρο 9): ${extraction.specialCategories ? "ναι" : "όχι"}

ΠΡΟΜΗΘΕΥΤΕΣ ΠΟΥ ΕΠΕΞΕΡΓΑΖΟΝΤΑΙ ΔΕΔΟΜΕΝΑ (υποψήφιοι υποεκτελούντες)
${extraction.vendors.filter((v) => v.triage === "PROCESSES_DATA").map((v) => `- ${v.name}${v.evidence ? ` — ${v.evidence}` : ""}`).join("\n") || "κανένας"}

ΠΡΟΜΗΘΕΥΤΕΣ ΠΟΥ ΑΠΛΩΣ ΠΡΟΜΗΘΕΥΟΥΝ ΕΞΟΠΛΙΣΜΟ/ΑΔΕΙΕΣ (δεν δικαιολογούν κενό)
${extraction.vendors.filter((v) => v.triage === "SUPPLIES_ONLY").map((v) => `- ${v.name}${v.evidence ? ` — ${v.evidence}` : ""}`).join("\n") || "κανένας"}

ΠΡΟΜΗΘΕΥΤΕΣ ΑΣΑΦΟΥΣ ΤΡΙΑΓΕ
${extraction.vendors.filter((v) => v.triage === "UNCLEAR").map((v) => `- ${v.name}`).join("\n") || "κανένας"}

ΤΑ ΜΕΡΗ (δεδομένα — μην προσθέσεις άλλα, μην παραλείψεις κανένα)
${parties.map((p, i) => `${i + 1}. "${p.name}" (ΑΦΜ: ${p.vat ?? "άγνωστο"})`).join("\n")}`;
}

export async function reasonAboutRoles(
  extraction: Extraction,
  profile: ComplianceProfile,
  parties: ConfirmedParty[],
  deps: ReasoningDeps = {}
): Promise<Reasoning> {
  if (parties.length === 0) {
    throw new Error(
      "Δεν δόθηκαν μέρη — πρέπει να επιβεβαιωθεί ποιοι είναι οι συμβαλλόμενοι πριν ζητηθεί νομική κρίση"
    );
  }

  const chat = deps.chat ?? deepseekChat;
  const user = buildUserPrompt(extraction, profile, parties);

  const attempt = async (temperature: number, extra = "") =>
    ReasoningSchema.parse(
      parseAiJson(
        await chat({ system: SYSTEM + extra, user, temperature, maxTokens: 4000 })
      )
    );

  try {
    return await attempt(0.2);
  } catch {
    try {
      return await attempt(
        0,
        "\nΠΡΟΣΟΧΗ: η προηγούμενη απάντηση ήταν άκυρη. Χρησιμοποίησε ΜΟΝΟ τις " +
          "επιτρεπτές τιμές των enum και επίστρεψε ΜΟΝΟ JSON."
      );
    } catch (e) {
      throw new Error(
        `Η νομική κρίση απέτυχε: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
}
