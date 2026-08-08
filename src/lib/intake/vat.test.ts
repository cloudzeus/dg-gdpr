import { describe, it, expect } from "vitest";
import { normalizeVat, isValidGreekVat } from "./vat";

describe("normalizeVat", () => {
  it("κρατά ένα καθαρό 9ψήφιο ΑΦΜ", () => {
    expect(normalizeVat("997939640")).toBe("997939640");
  });

  it.each([
    ["κενά", " 997 939 640 "],
    ["παύλες", "997-939-640"],
    ["τελείες", "997.939.640"],
    ["πρόθεμα EL", "EL997939640"],
    ["πρόθεμα el με κενό", "el 997939640"],
    ["πρόθεμα GR", "GR997939640"],
    ["ετικέτα ΑΦΜ", "ΑΦΜ: 997939640"],
  ])("καθαρίζει %s", (_label, input) => {
    expect(normalizeVat(input)).toBe("997939640");
  });

  it("συμπληρώνει μπροστινό μηδέν σε 8ψήφιο παλιό ΑΦΜ", () => {
    expect(normalizeVat("94014201")).toBe("094014201");
  });

  it.each([
    ["γράμμα O αντί για μηδέν", "O97939640", "097939640"],
    ["ελληνικό Ο αντί για μηδέν", "Ο97939640", "097939640"],
    ["ελληνικό Ι αντί για ένα", "Ι97939640", "197939640"],
  ])("διορθώνει ομόγραφο: %s", (_label, input, expected) => {
    expect(normalizeVat(input)).toBe(expected);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["κενό", ""],
    ["μόνο γράμματα", "ΑΦΜ"],
    ["7 ψηφία", "1234567"],
    ["10 ψηφία", "1234567890"],
  ])("επιστρέφει null για %s", (_label, input) => {
    expect(normalizeVat(input as string)).toBeNull();
  });
});

describe("isValidGreekVat", () => {
  it.each(["997939640", "094014201"])("δέχεται έγκυρο ΑΦΜ %s", (vat) => {
    expect(isValidGreekVat(vat)).toBe(true);
  });

  it("απορρίπτει ΑΦΜ με λάθος ψηφίο ελέγχου", () => {
    expect(isValidGreekVat("997939641")).toBe(false);
  });

  it("απορρίπτει σκέτα μηδενικά", () => {
    expect(isValidGreekVat("000000000")).toBe(false);
  });

  it("απορρίπτει μη κανονικοποιημένη είσοδο", () => {
    expect(isValidGreekVat("997-939-640")).toBe(false);
  });

  it.each([null, undefined, "", "12345678"])("απορρίπτει %p", (input) => {
    expect(isValidGreekVat(input as string)).toBe(false);
  });
});
