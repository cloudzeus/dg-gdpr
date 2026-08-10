import { describe, it, expect } from "vitest";
import { inferPolicyType } from "./policy-type";

describe("inferPolicyType", () => {
  it.each([
    ["Έλλειψη πολιτικής ελέγχου πρόσβασης", "ACCESS_CONTROL"],
    ["Έλλειψη πολιτικής διαχείρισης παραβιάσεων δεδομένων", "DATA_BREACH"],
    ["Απουσία πολιτικής διατήρησης δεδομένων", "DATA_RETENTION"],
    ["Δεν υπάρχει πολιτική αντιγράφων ασφαλείας", "BACKUP"],
    ["Λείπει πολιτική διαχείρισης προμηθευτών", "VENDOR_MANAGEMENT"],
    ["Απουσία πολιτικής κωδικών πρόσβασης", "PASSWORD_POLICY"],
    ["Λείπει πολιτική τηλεργασίας", "REMOTE_WORK"],
    ["Δεν υπάρχει πολιτική cookies", "COOKIE_POLICY"],
    ["Έλλειψη πολιτικής επιχειρησιακής συνέχειας", "BUSINESS_CONTINUITY"],
    ["Απουσία δήλωσης απορρήτου προς τα υποκείμενα", "PRIVACY_NOTICE"],
  ] as const)("«%s» → %s", (text, expected) => {
    expect(inferPolicyType(text)).toBe(expected);
  });

  it("η παραβίαση δεδομένων νικά τη γενική ασφάλεια", () => {
    // Και οι δύο λέξεις υπάρχουν· πρέπει να κερδίσει η πιο ειδική.
    expect(inferPolicyType("Πολιτική ασφάλειας για παραβιάσεις δεδομένων")).toBe("DATA_BREACH");
  });

  it("ο έλεγχος πρόσβασης νικά τη γενική ασφάλεια", () => {
    expect(inferPolicyType("Μέτρα ασφάλειας: λείπει πολιτική ελέγχου πρόσβασης")).toBe("ACCESS_CONTROL");
  });

  it("πέφτει στη γενική πολιτική ασφάλειας όταν δεν υπάρχει ειδικότερη", () => {
    expect(inferPolicyType("Δεν υπάρχει γενική πολιτική ασφάλειας πληροφοριών")).toBe("SECURITY_POLICY");
  });

  it.each([null, undefined, "", "   "])("επιστρέφει null για %p", (input) => {
    expect(inferPolicyType(input as string)).toBeNull();
  });

  it("επιστρέφει null όταν δεν αναγνωρίζει τίποτα, αντί να μαντέψει", () => {
    expect(inferPolicyType("Κάτι εντελώς άσχετο με πολιτικές")).toBeNull();
  });
});
