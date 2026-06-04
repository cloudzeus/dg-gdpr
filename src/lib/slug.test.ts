import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates ASCII", () => {
    expect(slugify("My Consent Project")).toBe("my-consent-project");
  });
  it("transliterates Greek to ASCII", () => {
    expect(slugify("Καμπάνια Newsletter")).toBe("kampania-newsletter");
  });
  it("strips punctuation and collapses dashes", () => {
    expect(slugify("Hello!!  World??")).toBe("hello-world");
  });
  it("trims leading/trailing dashes", () => {
    expect(slugify("  -test-  ")).toBe("test");
  });
});
