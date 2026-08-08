import { describe, it, expect } from "vitest";
import { isEmailDomainApproved, normalizeDomains, emailDomain } from "./approved-domains";

const GROUP = ["dgsoft.gr", "dgsmart.gr", "dgsoft.com.cy"];

describe("normalizeDomains", () => {
  it("κρατά έγκυρα domains πεζά και χωρίς κενά", () => {
    expect(normalizeDomains([" DGSoft.GR ", "dgsmart.gr"])).toEqual(["dgsoft.gr", "dgsmart.gr"]);
  });

  it("αφαιρεί @ και πρωτόκολλο και path", () => {
    expect(normalizeDomains(["@dgsoft.gr", "https://dgsmart.gr/", "http://a.gr/x/y"]))
      .toEqual(["dgsoft.gr", "dgsmart.gr", "a.gr"]);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["string αντί για πίνακα", "dgsoft.gr"],
    ["object", { d: "dgsoft.gr" }],
    ["αριθμός", 42],
  ])("επιστρέφει κενό για %s", (_label, input) => {
    expect(normalizeDomains(input)).toEqual([]);
  });

  it("πετά μη-string στοιχεία και κενά", () => {
    expect(normalizeDomains(["dgsoft.gr", 5, null, "  ", "@"])).toEqual(["dgsoft.gr"]);
  });
});

describe("emailDomain", () => {
  it("επιστρέφει το domain πεζά", () => {
    expect(emailDomain("GKozyris@DGSoft.GR")).toBe("dgsoft.gr");
  });

  it.each([
    ["κενό", ""],
    ["null", null],
    ["undefined", undefined],
    ["χωρίς @", "gkozyris.dgsoft.gr"],
    ["δύο @", "a@b@c.gr"],
    ["χωρίς local part", "@dgsoft.gr"],
    ["χωρίς domain", "gkozyris@"],
    ["domain χωρίς τελεία", "gkozyris@localhost"],
  ])("επιστρέφει null για %s", (_label, input) => {
    expect(emailDomain(input as string)).toBeNull();
  });
});

describe("isEmailDomainApproved", () => {
  it.each(GROUP)("δέχεται χρήστη του ομίλου σε %s", (domain) => {
    expect(isEmailDomainApproved(`someone@${domain}`, GROUP)).toBe(true);
  });

  it("δέχεται ανεξαρτήτως πεζών/κεφαλαίων", () => {
    expect(isEmailDomainApproved("Someone@DGSOFT.GR", GROUP)).toBe(true);
  });

  it("απορρίπτει domain εκτός ομίλου", () => {
    expect(isEmailDomainApproved("attacker@gmail.com", GROUP)).toBe(false);
  });

  it("απορρίπτει subdomain εγκεκριμένου domain", () => {
    expect(isEmailDomainApproved("someone@mail.dgsoft.gr", GROUP)).toBe(false);
  });

  it("απορρίπτει domain που απλώς τελειώνει σε εγκεκριμένο", () => {
    expect(isEmailDomainApproved("someone@notdgsoft.gr", GROUP)).toBe(false);
  });

  it("απορρίπτει domain που περιέχει εγκεκριμένο ως πρόθεμα", () => {
    expect(isEmailDomainApproved("someone@dgsoft.gr.evil.com", GROUP)).toBe(false);
  });

  it("κενή λίστα domains δεν επιτρέπει κανέναν", () => {
    expect(isEmailDomainApproved("someone@dgsoft.gr", [])).toBe(false);
  });

  it.each([null, undefined, "dgsoft.gr", {}])("άκυρη λίστα (%p) δεν επιτρέπει κανέναν", (domains) => {
    expect(isEmailDomainApproved("someone@dgsoft.gr", domains)).toBe(false);
  });

  it.each([null, undefined, "", "χωρίς-παπάκι"])("άκυρο email (%p) απορρίπτεται", (email) => {
    expect(isEmailDomainApproved(email as string, GROUP)).toBe(false);
  });
});
