import { describe, it, expect } from "vitest";
import { assignSides } from "./dpa";

type Party = { name: string; role: "CONTROLLER" | "PROCESSOR" | "JOINT_CONTROLLER" };

const ours = (role: Party["role"]): Party => ({ name: "DGSOFT ΕΕ", role });
const theirs = (role: Party["role"]): Party => ({ name: "ΑΦΟΙ ΚΟΛΛΕΡΗ ΙΚΕ", role });

describe("assignSides", () => {
  it("όταν είμαστε Εκτελών, Υπεύθυνος είναι ο αντισυμβαλλόμενος", () => {
    // Η περίπτωση που έσπασε στην πραγματική δοκιμή: το παραγόμενο DPA
    // ονόμαζε Υπεύθυνο Επεξεργασίας την εταιρεία λογισμικού.
    const r = assignSides(ours("PROCESSOR"), theirs("CONTROLLER"));
    expect(r.controllerParty.name).toBe("ΑΦΟΙ ΚΟΛΛΕΡΗ ΙΚΕ");
    expect(r.processorParty.name).toBe("DGSOFT ΕΕ");
  });

  it("όταν είμαστε Υπεύθυνος, Εκτελών είναι ο αντισυμβαλλόμενος", () => {
    const r = assignSides(ours("CONTROLLER"), theirs("PROCESSOR"));
    expect(r.controllerParty.name).toBe("DGSOFT ΕΕ");
    expect(r.processorParty.name).toBe("ΑΦΟΙ ΚΟΛΛΕΡΗ ΙΚΕ");
  });

  it("δεν εξαρτάται από το ποιος είναι «δικός μας» αλλά από τον ρόλο", () => {
    // Ίδια σειρά ορισμάτων, αντίθετοι ρόλοι → αντίθετη ανάθεση.
    const a = assignSides(ours("CONTROLLER"), theirs("PROCESSOR"));
    const b = assignSides(ours("PROCESSOR"), theirs("CONTROLLER"));
    expect(a.controllerParty.name).not.toBe(b.controllerParty.name);
  });

  it("στους από κοινού υπευθύνους γεμίζει και τις δύο θέσεις χωρίς να σκάει", () => {
    const r = assignSides(ours("JOINT_CONTROLLER"), theirs("JOINT_CONTROLLER"));
    expect(r.controllerParty.name).toBeTruthy();
    expect(r.processorParty.name).toBeTruthy();
    expect(r.controllerParty.name).not.toBe(r.processorParty.name);
  });
});
