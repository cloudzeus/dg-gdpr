// scripts/intake-smoke.ts
/**
 * Περνά ένα πραγματικό αρχείο από όλον τον αγωγό, χωρίς βάση και χωρίς UI.
 *
 *   npx tsx scripts/intake-smoke.ts ./δείγματα/συμβαση1.pdf [CONTRACT|OFFER|ANNEX]
 *
 * Τυπώνει: ποιότητα OCR, αν χρειάστηκε κλιμάκωση, τα μέρη με τα ΑΦΜ τους,
 * την αντιστοίχιση με τον όμιλο, τους προμηθευτές ανά τριάγε, τους
 * προτεινόμενους ρόλους και τα κενά.
 *
 * Δεν υπάρχει ακόμα η οθόνη επιβεβαίωσης μερών του βήματος 4 του wizard, οπότε
 * το script χτίζει τον ίδιο κλειστό κατάλογο που θα έφτιαχνε εκείνο το βήμα:
 * ό,τι ταίριαξε στην εξαγωγή με τον όμιλο, και μόνο όταν λείπει η μία πλευρά —
 * η μαμά ως δική μας, ή το recipientHint της εξαγωγής ως αντισυμβαλλόμενος.
 */
import { readFile } from "fs/promises";
import { basename, extname } from "path";
import { readDocument, estimatePageCount } from "../src/lib/intake/ocr";
import { extractContract, type DocumentKind } from "../src/lib/intake/extraction";
import { reasonAboutRoles, type ConfirmedParty } from "../src/lib/intake/reasoning";
import { buildComplianceProfile, getOwnGroupCandidates } from "../src/lib/intake/compliance-profile";
import { matchParty } from "../src/lib/intake/company-match";

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const VALID_KINDS: DocumentKind[] = ["CONTRACT", "OFFER", "ANNEX", "CORRESPONDENCE", "OTHER"];

async function main() {
  const path = process.argv[2];
  const kindArg = (process.argv[3]?.toUpperCase() as DocumentKind | undefined) ?? "CONTRACT";
  if (!path) {
    console.error("Χρήση: npx tsx scripts/intake-smoke.ts <αρχείο> [CONTRACT|OFFER|ANNEX]");
    process.exit(1);
  }
  if (!VALID_KINDS.includes(kindArg)) {
    console.error(`Άγνωστο είδος εγγράφου: ${kindArg} (${VALID_KINDS.join("|")})`);
    process.exit(1);
  }

  const mimeType = MIME[extname(path).toLowerCase()];
  if (!mimeType) {
    console.error(`Μη υποστηριζόμενη κατάληξη: ${extname(path)}`);
    process.exit(1);
  }

  const buffer = await readFile(path);
  console.log(`\n▸ ${basename(path)} (${Math.round(buffer.length / 1024)} KB) — είδος: ${kindArg}\n`);

  const pageCount = estimatePageCount(buffer, mimeType);
  console.log(`  σελίδες: ${pageCount ?? "άγνωστο"}`);

  console.time("OCR");
  const ocr = await readDocument({ buffer, mimeType, pageCount, kind: kindArg });
  console.timeEnd("OCR");
  console.log(`  ποιότητα: ${ocr.quality.toFixed(2)}  μοντέλο: ${ocr.model}  κλιμάκωση: ${ocr.escalated ? "ΝΑΙ" : "όχι"}`);
  console.log(`  χαρακτήρες: ${ocr.text.length}\n`);

  console.time("Εξαγωγή");
  const extraction = await extractContract([{ text: ocr.text, buffer, mimeType, kind: kindArg }]);
  console.timeEnd("Εξαγωγή");

  const candidates = await getOwnGroupCandidates();
  console.log("\n  ΜΕΡΗ (από το έγγραφο):");
  if (extraction.parties.length === 0) {
    console.log("   (κανένα — αναμενόμενο για προσφορά/παράρτημα)");
  }
  const matchedParties: ConfirmedParty[] = [];
  for (const p of extraction.parties) {
    const m = matchParty({ name: p.name, vat: p.vat }, candidates);
    console.log(
      `   • ${p.name} — ΑΦΜ ${p.vat ?? "—"} → ${m ? `${m.side} (${m.method}, ${m.score})` : "ΔΕΝ ΤΑΙΡΙΑΞΕ"}`
    );
    matchedParties.push({ name: p.name, vat: p.vat, side: m?.side ?? "EXTERNAL" });
  }

  console.log("\n  ΠΡΟΜΗΘΕΥΤΕΣ (τριάγε):");
  const byTriage = {
    PROCESSES_DATA: extraction.vendors.filter((v) => v.triage === "PROCESSES_DATA"),
    SUPPLIES_ONLY: extraction.vendors.filter((v) => v.triage === "SUPPLIES_ONLY"),
    UNCLEAR: extraction.vendors.filter((v) => v.triage === "UNCLEAR"),
  };
  for (const [triage, vendors] of Object.entries(byTriage)) {
    console.log(`   ${triage}:`);
    if (vendors.length === 0) console.log("     (κανένας)");
    for (const v of vendors) {
      console.log(`     • ${v.name}${v.evidence ? ` — ${v.evidence}` : ""}`);
    }
  }

  // Ο κλειστός κατάλογος που θα έφτιαχνε το βήμα 4: ό,τι ταίριαξε + καλύμματα
  // κενού με τεκμηριωμένη πηγή, ποτέ εφευρημένο μέρος.
  const profile = await buildComplianceProfile();
  const parties: ConfirmedParty[] = [...matchedParties];
  console.log("\n  ΕΠΙΒΕΒΑΙΩΜΕΝΑ ΜΕΡΗ ΓΙΑ ΤΗΝ ΚΡΙΣΗ:");
  for (const p of matchedParties) {
    console.log(`   • ${p.name} — ${p.side} (πηγή: έγγραφο)`);
  }

  if (!parties.some((p) => p.side !== "EXTERNAL")) {
    if (profile.mother.name && profile.mother.name !== "—") {
      const mother: ConfirmedParty = { name: profile.mother.name, vat: profile.mother.vatNumber, side: "OWN_MOTHER" };
      parties.push(mother);
      console.log(`   • ${mother.name} — OWN_MOTHER (πηγή: organisation)`);
    } else {
      console.log("   ⚠ καμία δική μας εταιρία δεν βρέθηκε ούτε στο έγγραφο ούτε στο Organization");
    }
  }

  if (!parties.some((p) => p.side === "EXTERNAL")) {
    if (extraction.recipientHint) {
      const recipient: ConfirmedParty = { name: extraction.recipientHint, vat: null, side: "EXTERNAL" };
      parties.push(recipient);
      console.log(`   • ${recipient.name} — EXTERNAL (πηγή: recipientHint)`);
    } else {
      console.log("   ⚠ κανένας αντισυμβαλλόμενος δεν βρέθηκε ούτε στο έγγραφο ούτε στο recipientHint");
    }
  }

  console.time("\nΚρίση");
  const reasoning = await reasonAboutRoles(extraction, profile, parties);
  console.timeEnd("\nΚρίση");

  console.log("\n  ΡΟΛΟΙ:");
  for (const r of reasoning.partyRoles) {
    console.log(`   • ${r.name}: ${r.role} — ${r.rationale ?? ""} [${r.gdprArticles.join(", ")}]`);
  }

  console.log("\n  ΚΕΝΑ:");
  for (const g of reasoning.gaps) {
    console.log(`   • [${g.severity}] ${g.title} → ${g.remedyType ?? "—"}`);
  }
  console.log();
  process.exit(0);
}

main().catch((e) => {
  console.error("\n✖", e);
  process.exit(1);
});
