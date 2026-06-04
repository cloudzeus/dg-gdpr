import { describe, it, expect } from "vitest";
import { generateConsentToken, getClientIp } from "@/lib/consent-token";

describe("generateConsentToken", () => {
  it("returns a 64-char hex string", () => {
    const t = generateConsentToken();
    expect(t).toMatch(/^[a-f0-9]{64}$/);
  });
  it("returns unique tokens", () => {
    expect(generateConsentToken()).not.toBe(generateConsentToken());
  });
});

describe("getClientIp", () => {
  it("reads the first x-forwarded-for entry", () => {
    const h = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientIp(h)).toBe("1.2.3.4");
  });
  it("falls back to x-real-ip", () => {
    const h = new Headers({ "x-real-ip": "9.9.9.9" });
    expect(getClientIp(h)).toBe("9.9.9.9");
  });
  it("returns 'unknown' when no headers present", () => {
    expect(getClientIp(new Headers())).toBe("unknown");
  });
});
