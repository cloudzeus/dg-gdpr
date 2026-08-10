import { describe, it, expect } from "vitest";
import { buildArticle28Clauses, type ClauseInput } from "./clauses";

const input: ClauseInput = {
  controllerName: "ΚΟΣΜΟΚΑΡ Α.Ε.",
  processorName: "DGSOFT ΕΕ",
  subject: "Ανάπτυξη και υποστήριξη CRM",
  dataCategories: ["Στοιχεία πελατών", "Ιστορικό παραγγελιών"],
  purposes: ["Λειτουργία και υποστήριξη του συστήματος"],
  retentionPeriod: "Για τη διάρκεια της σύμβασης και 12 μήνες μετά",
  subProcessors: ["Coolify", "Hetzner Online GmbH"],
  crossBorderTransfer: false,
  specialCategories: false,
};

describe("buildArticle28Clauses", () => {
  it("παράγει τις υποχρεωτικές ρήτρες του άρθρου 28 παρ. 3", () => {
    const cs = buildArticle28Clauses(input);
    const all = cs.map((c) => c.title + " " + c.body).join(" ");
    // Οι οκτώ υποχρεωτικές δεσμεύσεις της παρ. 3
    for (const term of ["εντολή", "εμπιστευτικ", "ασφάλεια", "υποεκτελ", "δικαιώματα", "συνδρομή", "διαγραφή", "έλεγχ"]) {
      expect(all.toLowerCase()).toContain(term.toLowerCase());
    }
  });

  it("αναφέρει ονομαστικά τα μέρη", () => {
    const all = buildArticle28Clauses(input).map((c) => c.body).join(" ");
    expect(all).toContain("ΚΟΣΜΟΚΑΡ Α.Ε.");
    expect(all).toContain("DGSOFT ΕΕ");
  });

  it("απαριθμεί τους υποεκτελούντες που βρέθηκαν", () => {
    const all = buildArticle28Clauses(input).map((c) => c.body).join(" ");
    expect(all).toContain("Coolify");
    expect(all).toContain("Hetzner Online GmbH");
  });

  it("χωρίς υποεκτελούντες, η ρήτρα λέει ότι δεν υπάρχουν", () => {
    const all = buildArticle28Clauses({ ...input, subProcessors: [] }).map((c) => c.body).join(" ");
    expect(all).toMatch(/δεν χρησιμοποι|καμία|κανένας/i);
  });

  it("προσθέτει ρήτρα διασυνοριακής μεταφοράς μόνο όταν υπάρχει", () => {
    const without = buildArticle28Clauses(input).map((c) => c.title).join("|");
    const with_ = buildArticle28Clauses({ ...input, crossBorderTransfer: true }).map((c) => c.title).join("|");
    expect(without).not.toMatch(/μεταφορ/i);
    expect(with_).toMatch(/μεταφορ/i);
  });

  it("προσθέτει ρήτρα ειδικών κατηγοριών μόνο όταν υπάρχουν", () => {
    const with_ = buildArticle28Clauses({ ...input, specialCategories: true }).map((c) => c.title).join("|");
    expect(with_).toMatch(/ειδικ/i);
  });

  it("κάθε ρήτρα έχει τίτλο και σώμα, κανένα κενό", () => {
    for (const c of buildArticle28Clauses(input)) {
      expect(c.title.trim().length).toBeGreaterThan(0);
      expect(c.body.trim().length).toBeGreaterThan(20);
    }
  });

  it("η αρίθμηση ξεκινά από όπου της πουν", () => {
    const cs = buildArticle28Clauses(input, 7);
    expect(cs[0].number).toBe(7);
    expect(cs[1].number).toBe(8);
  });

  it("χωρίς αρχική αρίθμηση ξεκινά από το 1", () => {
    expect(buildArticle28Clauses(input)[0].number).toBe(1);
  });
});
