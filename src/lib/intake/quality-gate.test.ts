import { describe, it, expect } from "vitest";
import { scoreOcrText, needsEscalation, DEFAULT_QUALITY_THRESHOLD } from "./quality-gate";

const GOOD = `
ΣΥΜΒΑΣΗ ΠΑΡΟΧΗΣ ΥΠΗΡΕΣΙΩΝ

Στην Αθήνα σήμερα 12 Μαρτίου 2026, ΜΕΤΑΞΥ αφενός της εταιρείας DGSOFT ΕΕ,
με ΑΦΜ 997939640, ΔΟΥ ΚΕΦΟΔΕ ΑΤΤΙΚΗΣ, και αφετέρου της ΚΟΣΜΟΚΑΡ Α.Ε.,
με ΑΦΜ 094059163, συμφωνήθηκαν τα ακόλουθα όσον αφορά την επεξεργασία
δεδομένων προσωπικού χαρακτήρα σύμφωνα με τον Κανονισμό 2016/679.
`;

describe("scoreOcrText", () => {
  it("δίνει υψηλό score σε καθαρό ελληνικό συμβατικό κείμενο", () => {
    expect(scoreOcrText(GOOD, 1)).toBeGreaterThanOrEqual(0.9);
  });

  it("δίνει 0 σε κενό κείμενο", () => {
    expect(scoreOcrText("", 1)).toBe(0);
    expect(scoreOcrText("   \n  ", 1)).toBe(0);
  });

  it("τιμωρεί κείμενο γεμάτο replacement characters", () => {
    const garbled = "�".repeat(200) + GOOD;
    expect(scoreOcrText(garbled, 1)).toBeLessThan(DEFAULT_QUALITY_THRESHOLD);
  });

  it("η καθαρότητα είναι πολλαπλασιαστής, όχι ένα σήμα ανάμεσα σε άλλα", () => {
    // Ίδιο κείμενο, ίδιοι όροι, ίδια ελληνικότητα — μόνο τα σκουπίδια αλλάζουν.
    // Με προσθετικά βάρη αυτό έπαιρνε 0.79 και περνούσε την πύλη.
    expect(scoreOcrText("�".repeat(200) + GOOD, 1)).toBe(0);
  });

  it("τιμωρεί λατινικό κείμενο εκεί που περιμέναμε ελληνικό", () => {
    const latin = "AGREEMENT FOR SERVICES ".repeat(30);
    expect(scoreOcrText(latin, 1)).toBeLessThan(DEFAULT_QUALITY_THRESHOLD);
  });

  it("τιμωρεί υπερβολικά λίγο κείμενο για τον αριθμό σελίδων", () => {
    expect(scoreOcrText(GOOD, 20)).toBeLessThan(DEFAULT_QUALITY_THRESHOLD);
  });

  it("ανταμείβει την παρουσία συμβατικών όρων", () => {
    const withoutTerms = GOOD
      .replace(/ΣΥΜΒΑΣΗ/g, "ΚΕΙΜΕΝΟ")
      .replace(/ΜΕΤΑΞΥ/g, "ανάμεσα")
      .replace(/ΑΦΜ/g, "αριθμός");
    expect(scoreOcrText(GOOD, 1)).toBeGreaterThan(scoreOcrText(withoutTerms, 1));
  });

  it("το score μένει πάντα στο [0,1]", () => {
    for (const [text, pages] of [[GOOD, 1], ["", 1], ["�", 5], [GOOD.repeat(50), 1]] as const) {
      const s = scoreOcrText(text as string, pages as number);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  it("μηδενικές ή άγνωστες σελίδες αντιμετωπίζονται ως μία", () => {
    expect(scoreOcrText(GOOD, 0)).toBe(scoreOcrText(GOOD, 1));
    expect(scoreOcrText(GOOD, null)).toBe(scoreOcrText(GOOD, 1));
  });
});

describe("needsEscalation", () => {
  it("κάτω από το κατώφλι κλιμακώνει", () => {
    expect(needsEscalation(0.5, 0.7)).toBe(true);
  });

  it("ακριβώς στο κατώφλι ΔΕΝ κλιμακώνει", () => {
    expect(needsEscalation(0.7, 0.7)).toBe(false);
  });

  it("πάνω από το κατώφλι δεν κλιμακώνει", () => {
    expect(needsEscalation(0.95, 0.7)).toBe(false);
  });

  it("χρησιμοποιεί το προεπιλεγμένο κατώφλι όταν δεν δοθεί", () => {
    expect(needsEscalation(DEFAULT_QUALITY_THRESHOLD - 0.01)).toBe(true);
    expect(needsEscalation(DEFAULT_QUALITY_THRESHOLD)).toBe(false);
  });
});
