// scripts/intake-smoke.ts
/**
 * Περνά ένα πραγματικό αρχείο από όλον τον αγωγό, χωρίς βάση και χωρίς UI.
 *
 *   npx tsx scripts/intake-smoke.ts ./δείγματα/συμβαση1.pdf
 *
 * Τυπώνει: ποιότητα OCR, αν χρειάστηκε κλιμάκωση, τα μέρη με τα ΑΦΜ τους,
 * την αντιστοίχιση με τον όμιλο, τους προτεινόμενους ρόλους και τα κενά.
 */
import { readFile } from "fs/promises";
import { basename, extname } from "path";
import { readDocument, estimatePageCount } from "../src/lib/intake/ocr";
import { extractContract } from "../src/lib/intake/extraction";
import { reasonAboutRoles } from "../src/lib/intake/reasoning";
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

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Χρήση: npx tsx scripts/intake-smoke.ts <αρχείο>");
    process.exit(1);
  }

  const mimeType = MIME[extname(path).toLowerCase()];
  if (!mimeType) {
    console.error(`Μη υποστηριζόμενη κατάληξη: ${extname(path)}`);
    process.exit(1);
  }

  const buffer = await readFile(path);
  console.log(`\n▸ ${basename(path)} (${Math.round(buffer.length / 1024)} KB)\n`);

  const pageCount = estimatePageCount(buffer, mimeType);
  console.log(`  σελίδες: ${pageCount ?? "άγνωστο"}`);

  console.time("OCR");
  const ocr = await readDocument({ buffer, mimeType, pageCount });
  console.timeEnd("OCR");
  console.log(`  ποιότητα: ${ocr.quality.toFixed(2)}  μοντέλο: ${ocr.model}  κλιμάκωση: ${ocr.escalated ? "ΝΑΙ" : "όχι"}`);
  console.log(`  χαρακτήρες: ${ocr.text.length}\n`);

  console.time("Εξαγωγή");
  const extraction = await extractContract([{ text: ocr.text, buffer, mimeType }]);
  console.timeEnd("Εξαγωγή");

  const candidates = await getOwnGroupCandidates();
  console.log("\n  ΜΕΡΗ:");
  for (const p of extraction.parties) {
    const m = matchParty({ name: p.name, vat: p.vat }, candidates);
    console.log(
      `   • ${p.name} — ΑΦΜ ${p.vat ?? "—"} → ${m ? `${m.side} (${m.method}, ${m.score})` : "ΔΕΝ ΤΑΙΡΙΑΞΕ"}`
    );
  }

  console.time("\nΚρίση");
  const profile = await buildComplianceProfile();
  const reasoning = await reasonAboutRoles(extraction, profile);
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
