import { describe, it, expect } from "vitest";
import { canCompleteProject, latestPerDocument, type SignatureState, type GapState, type DocumentSignature } from "./completion";

const signed: SignatureState = { status: "SIGNED", recipientName: "Α", declineReason: null };
const critical = (status: string): GapState => ({ severity: "CRITICAL", status, dismissReason: null });

describe("canCompleteProject", () => {
  it("επιτρέπει όταν όλα υπογράφηκαν και τα κρίσιμα λύθηκαν", () => {
    expect(canCompleteProject([signed], [critical("RESOLVED")])).toEqual({ allowed: true, reasons: [] });
  });

  it("επιτρέπει έργο χωρίς υπογραφές και χωρίς κρίσιμα κενά", () => {
    expect(canCompleteProject([], []).allowed).toBe(true);
  });

  it.each(["PENDING", "SENT", "VIEWED"])("μπλοκάρει όσο μια υπογραφή είναι %s", (status) => {
    const r = canCompleteProject([{ ...signed, status }], []);
    expect(r.allowed).toBe(false);
    expect(r.reasons.join()).toMatch(/υπογραφ/i);
  });

  it("μπλοκάρει σε άρνηση και αναφέρει τον λόγο", () => {
    const r = canCompleteProject(
      [{ status: "DECLINED", recipientName: "Κολλέρης", declineReason: "Θέλουμε αλλαγή στο άρθρο 5" }],
      []
    );
    expect(r.allowed).toBe(false);
    expect(r.reasons.join()).toContain("Κολλέρης");
    expect(r.reasons.join()).toContain("άρθρο 5");
  });

  it("μπλοκάρει σε ληγμένη υπογραφή", () => {
    expect(canCompleteProject([{ ...signed, status: "EXPIRED" }], []).allowed).toBe(false);
  });

  it.each(["OPEN", "DRAFTED"])("μπλοκάρει κρίσιμο κενό σε %s — εδώ δεν αρκεί το πρόχειρο", (status) => {
    const r = canCompleteProject([], [critical(status)]);
    expect(r.allowed).toBe(false);
    expect(r.reasons.join()).toMatch(/κρίσιμ/i);
  });

  it("το DISMISSED με αιτιολογία περνά", () => {
    const gap: GapState = { severity: "CRITICAL", status: "DISMISSED", dismissReason: "Καλύπτεται αλλού" };
    expect(canCompleteProject([], [gap]).allowed).toBe(true);
  });

  it("το DISMISSED χωρίς αιτιολογία δεν περνά", () => {
    const gap: GapState = { severity: "CRITICAL", status: "DISMISSED", dismissReason: "  " };
    expect(canCompleteProject([], [gap]).allowed).toBe(false);
  });

  it("τα μη κρίσιμα κενά δεν εμποδίζουν το κλείσιμο", () => {
    for (const severity of ["HIGH", "MEDIUM", "LOW"]) {
      expect(canCompleteProject([], [{ severity, status: "OPEN", dismissReason: null }]).allowed).toBe(true);
    }
  });

  it("συγκεντρώνει όλους τους λόγους", () => {
    const r = canCompleteProject([{ ...signed, status: "PENDING" }], [critical("OPEN")]);
    expect(r.reasons.length).toBeGreaterThanOrEqual(2);
  });
});

describe("latestPerDocument", () => {
  const doc = (id: string, status: string, createdAt: string): SignatureState & DocumentSignature => ({
    status,
    recipientName: "Α",
    declineReason: null,
    entityType: "DpaContract",
    entityId: id,
    createdAt: new Date(createdAt),
  });

  it("κρατά μόνο το πιο πρόσφατο αίτημα ανά έγγραφο", () => {
    const expired = doc("dpa-1", "EXPIRED", "2026-01-01");
    const signedLater = doc("dpa-1", "SIGNED", "2026-02-01");
    const result = latestPerDocument([expired, signedLater]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(signedLater);
  });

  it("δεν μπλοκάρει πλέον το κλείσιμο όταν ένα ληγμένο αίτημα αντικαταστάθηκε και υπογράφηκε", () => {
    const expired = doc("dpa-1", "EXPIRED", "2026-01-01");
    const signedLater = doc("dpa-1", "SIGNED", "2026-02-01");
    const verdict = canCompleteProject(latestPerDocument([expired, signedLater]), []);
    expect(verdict.allowed).toBe(true);
  });

  it("διατηρεί ξεχωριστές εγγραφές για διαφορετικά έγγραφα", () => {
    const a = doc("dpa-1", "SIGNED", "2026-01-01");
    const b = doc("dpa-2", "PENDING", "2026-01-02");
    const result = latestPerDocument([a, b]);
    expect(result).toHaveLength(2);
  });

  it("η σειρά εισόδου δεν επηρεάζει ποιο θεωρείται πιο πρόσφατο", () => {
    const older = doc("dpa-1", "SIGNED", "2026-01-01");
    const newer = doc("dpa-1", "DECLINED", "2026-03-01");
    // Νεότερο πρώτο στη λίστα — πρέπει να κερδίζει πάλι το πιο πρόσφατο κατά ημερομηνία.
    const result = latestPerDocument([newer, older]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(newer);
  });
});
