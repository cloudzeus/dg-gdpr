import { describe, it, expect } from "vitest";
import { consentVerifyEmail, consentConfirmedEmail, preferenceAccessEmail } from "@/lib/consent-email";

describe("consent email templates", () => {
  it("verify email includes the confirm URL and project name", () => {
    const { subject, html } = consentVerifyEmail({ projectName: "Newsletter", confirmUrl: "https://x/c/n/confirm/abc" });
    expect(subject).toContain("Newsletter");
    expect(html).toContain("https://x/c/n/confirm/abc");
  });
  it("preference access email includes the manage URL", () => {
    const { html } = preferenceAccessEmail({ projectName: "N", manageUrl: "https://x/c/n/manage/tok" });
    expect(html).toContain("https://x/c/n/manage/tok");
  });
  it("confirmed email returns subject + html", () => {
    const out = consentConfirmedEmail({ projectName: "N", confirmedAt: new Date("2026-06-04T10:00:00Z") });
    expect(out.subject).toBeTruthy();
    expect(out.html).toContain("N");
  });
});
