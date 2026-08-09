import { describe, it, expect } from "vitest";
import { toDpaRole, type PartyRoleValue } from "./role-mapping";

describe("toDpaRole", () => {
  it.each([
    ["CONTROLLER", "PROCESSOR", "COMPANY_AS_PROCESSOR"],
    ["PROCESSOR", "CONTROLLER", "COMPANY_AS_CONTROLLER"],
    ["JOINT_CONTROLLER", "JOINT_CONTROLLER", "JOINT_CONTROLLERS"],
  ] as const)("(%s, %s) → %s", (ours, theirs, expected) => {
    expect(toDpaRole(ours, theirs)).toBe(expected);
  });

  it.each([
    ["CONTROLLER", "CONTROLLER"],
    ["PROCESSOR", "PROCESSOR"],
    ["CONTROLLER", "JOINT_CONTROLLER"],
    ["SUB_PROCESSOR", "CONTROLLER"],
    ["RECIPIENT", "PROCESSOR"],
    ["THIRD_PARTY", "THIRD_PARTY"],
  ] as [PartyRoleValue, PartyRoleValue][])(
    "(%s, %s) είναι άκυρος συνδυασμός → null",
    (ours, theirs) => {
      expect(toDpaRole(ours, theirs)).toBeNull();
    }
  );

  it("επιστρέφει null όταν λείπει ρόλος", () => {
    expect(toDpaRole(null, "PROCESSOR")).toBeNull();
    expect(toDpaRole("CONTROLLER", null)).toBeNull();
    expect(toDpaRole(null, null)).toBeNull();
  });
});
