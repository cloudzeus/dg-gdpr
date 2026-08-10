import { describe, it, expect } from "vitest";
import { canCommit, type GapState, type PartyState } from "./blocking-rule";

const ok: PartyState[] = [
  { side: "OWN_MOTHER", confirmedRole: "PROCESSOR" },
  { side: "EXTERNAL", confirmedRole: "CONTROLLER" },
];

const gap = (over: Partial<GapState> = {}): GapState => ({
  severity: "CRITICAL",
  status: "DRAFTED",
  dismissReason: null,
  remedyType: null,
  ...over,
});

describe("canCommit", () => {
  it("επιτρέπει όταν δεν υπάρχουν κενά", () => {
    expect(canCommit(ok, [])).toEqual({ allowed: true, reasons: [] });
  });

  it("επιτρέπει κρίσιμο κενό σε DRAFTED", () => {
    expect(canCommit(ok, [gap({ status: "DRAFTED" })]).allowed).toBe(true);
  });

  it("επιτρέπει κρίσιμο κενό σε RESOLVED", () => {
    expect(canCommit(ok, [gap({ status: "RESOLVED" })]).allowed).toBe(true);
  });

  it("μπλοκάρει κρίσιμο κενό σε OPEN χωρίς προτεινόμενη κάλυψη", () => {
    const r = canCommit(ok, [gap({ status: "OPEN", remedyType: null })]);
    expect(r.allowed).toBe(false);
    expect(r.reasons.join()).toMatch(/κρίσιμ/i);
  });

  it("επιτρέπει κρίσιμο κενό σε OPEN όταν έχει προτεινόμενη κάλυψη — το σύστημα θα το κλείσει μόνο του", () => {
    const r = canCommit(ok, [gap({ status: "OPEN", remedyType: "CREATE_DPA" })]);
    expect(r.allowed).toBe(true);
    expect(r.reasons).toEqual([]);
  });

  it("μπλοκάρει DISMISSED χωρίς αιτιολογία", () => {
    expect(canCommit(ok, [gap({ status: "DISMISSED", dismissReason: null })]).allowed).toBe(false);
    expect(canCommit(ok, [gap({ status: "DISMISSED", dismissReason: "  " })]).allowed).toBe(false);
  });

  it("επιτρέπει DISMISSED με αιτιολογία", () => {
    expect(canCommit(ok, [gap({ status: "DISMISSED", dismissReason: "Καλύπτεται από την ISO 27001" })]).allowed).toBe(true);
  });

  it("τα μη κρίσιμα κενά δεν μπλοκάρουν ποτέ", () => {
    for (const severity of ["HIGH", "MEDIUM", "LOW"] as const) {
      expect(canCommit(ok, [gap({ severity, status: "OPEN" })]).allowed).toBe(true);
    }
  });

  it("μπλοκάρει όταν κανένα μέρος δεν είναι δικό μας", () => {
    const r = canCommit([{ side: "EXTERNAL", confirmedRole: "CONTROLLER" }], []);
    expect(r.allowed).toBe(false);
    expect(r.reasons.join()).toMatch(/δική μας/i);
  });

  it("μπλοκάρει όταν υπάρχουν δύο μαμάδες", () => {
    const r = canCommit(
      [
        { side: "OWN_MOTHER", confirmedRole: "PROCESSOR" },
        { side: "OWN_MOTHER", confirmedRole: "CONTROLLER" },
        { side: "EXTERNAL", confirmedRole: "CONTROLLER" },
      ],
      []
    );
    expect(r.allowed).toBe(false);
    expect(r.reasons.join()).toMatch(/μαμά/i);
  });

  it("μπλοκάρει όταν μέρος δεν έχει επιβεβαιωμένο ρόλο", () => {
    const r = canCommit(
      [{ side: "OWN_MOTHER", confirmedRole: null }, { side: "EXTERNAL", confirmedRole: "CONTROLLER" }],
      []
    );
    expect(r.allowed).toBe(false);
    expect(r.reasons.join()).toMatch(/ρόλο/i);
  });

  it("επιτρέπει σύμβαση μόνο με θυγατρική, χωρίς μαμά", () => {
    expect(
      canCommit(
        [{ side: "OWN_GROUP", confirmedRole: "PROCESSOR" }, { side: "EXTERNAL", confirmedRole: "CONTROLLER" }],
        []
      ).allowed
    ).toBe(true);
  });

  it("μπλοκάρει όταν όλα τα μέρη είναι δικά μας", () => {
    const r = canCommit(
      [
        { side: "OWN_MOTHER", confirmedRole: "CONTROLLER" },
        { side: "OWN_GROUP", confirmedRole: "PROCESSOR" },
      ],
      []
    );
    expect(r.allowed).toBe(false);
    expect(r.reasons.join()).toMatch(/αντισυμβαλλόμεν/i);
  });

  it("μπλοκάρει όταν οι ρόλοι δεν συνδυάζονται σε σύμβαση επεξεργασίας", () => {
    // Παρατηρήθηκε σε πραγματική δοκιμή: το μοντέλο έδωσε CONTROLLER και στις
    // δύο πλευρές ενώ η αιτιολόγησή του περιέγραφε σχέση εκτελούντος.
    const r = canCommit(
      [
        { side: "OWN_MOTHER", confirmedRole: "CONTROLLER" },
        { side: "EXTERNAL", confirmedRole: "CONTROLLER" },
      ],
      []
    );
    expect(r.allowed).toBe(false);
    expect(r.reasons.join()).toMatch(/συνδυασμ/i);
  });

  it.each([
    ["CONTROLLER", "PROCESSOR"],
    ["PROCESSOR", "CONTROLLER"],
    ["JOINT_CONTROLLER", "JOINT_CONTROLLER"],
  ] as const)("επιτρέπει το έγκυρο ζεύγος (%s, %s)", (ours, theirs) => {
    expect(
      canCommit([{ side: "OWN_MOTHER", confirmedRole: ours }, { side: "EXTERNAL", confirmedRole: theirs }], []).allowed
    ).toBe(true);
  });

  it("συγκεντρώνει όλους τους λόγους, δεν σταματά στον πρώτο", () => {
    const r = canCommit([{ side: "EXTERNAL", confirmedRole: null }], [gap({ status: "OPEN" })]);
    expect(r.reasons.length).toBeGreaterThanOrEqual(3);
  });
});
