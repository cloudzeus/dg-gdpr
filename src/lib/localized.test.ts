import { describe, it, expect } from "vitest";
import { loc, emptyLocalized, type LocalizedText } from "@/lib/localized";

describe("loc", () => {
  const v: LocalizedText = { el: "Όνομα", en: "Name" };
  it("returns the requested locale", () => {
    expect(loc(v, "en")).toBe("Name");
    expect(loc(v, "el")).toBe("Όνομα");
  });
  it("falls back to el when requested locale is empty", () => {
    expect(loc({ el: "Όνομα", en: "" }, "en")).toBe("Όνομα");
  });
  it("handles null/undefined safely", () => {
    expect(loc(null, "el")).toBe("");
    expect(loc(undefined, "en")).toBe("");
  });
  it("accepts a JSON value (unknown) shape", () => {
    expect(loc({ el: "Α", en: "A" } as unknown, "en")).toBe("A");
  });
});

describe("emptyLocalized", () => {
  it("returns both keys empty", () => {
    expect(emptyLocalized()).toEqual({ el: "", en: "" });
  });
});
