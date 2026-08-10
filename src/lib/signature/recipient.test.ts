import { describe, it, expect } from "vitest";
import { resolveRecipient } from "./recipient";

const real = { name: "Δημήτριος Κολλέρης", email: "d.kolleris@example.gr" };

describe("resolveRecipient", () => {
  it("χωρίς ανακατεύθυνση στέλνει στον πραγματικό παραλήπτη", () => {
    const r = resolveRecipient(real, undefined);
    expect(r.to).toBe("d.kolleris@example.gr");
    expect(r.redirected).toBe(false);
    expect(r.notice).toBeNull();
  });

  it.each(["", "   "])("κενή μεταβλητή (%p) δεν ανακατευθύνει", (v) => {
    expect(resolveRecipient(real, v).redirected).toBe(false);
  });

  it("με ανακατεύθυνση στέλνει ΜΟΝΟ εκεί", () => {
    const r = resolveRecipient(real, "test@i4ria.com");
    expect(r.to).toBe("test@i4ria.com");
    expect(r.redirected).toBe(true);
  });

  it("η προειδοποίηση λέει πού θα πήγαινε κανονικά", () => {
    const r = resolveRecipient(real, "test@i4ria.com");
    expect(r.notice).toContain("d.kolleris@example.gr");
    expect(r.notice).toContain("Δημήτριος Κολλέρης");
    expect(r.notice).toMatch(/δοκιμ/i);
  });

  it("καθαρίζει κενά γύρω από τη διεύθυνση", () => {
    expect(resolveRecipient(real, "  test@i4ria.com  ").to).toBe("test@i4ria.com");
  });

  it("ΠΟΤΕ δεν επιστρέφει τον πραγματικό παραλήπτη όταν η ανακατεύθυνση είναι ενεργή", () => {
    // Ο πιο σημαντικός ισχυρισμός του αρχείου.
    for (const email of ["a@b.gr", "ΚΕΦΑΛΑΙΑ@B.GR", "  c@d.gr "]) {
      const r = resolveRecipient({ name: "Χ", email }, "guard@i4ria.com");
      expect(r.to).toBe("guard@i4ria.com");
      expect(r.to).not.toBe(email.trim());
    }
  });
});
