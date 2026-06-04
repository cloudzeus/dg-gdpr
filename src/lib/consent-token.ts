import { randomBytes } from "crypto";

export function generateConsentToken(): string {
  return randomBytes(32).toString("hex");
}

// Resolve the real visitor IP. Behind Cloudflare, x-forwarded-for / x-real-ip get
// set to a Cloudflare edge IP (e.g. 172.68.x.x), so the Cloudflare-specific
// CF-Connecting-IP / True-Client-IP headers are checked first. Only trustworthy
// when the app runs behind a trusted reverse proxy that sets these headers.
type HeaderGetter = { get(name: string): string | null };

export function getClientIp(headers: HeaderGetter): string {
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const trueClient = headers.get("true-client-ip");
  if (trueClient) return trueClient.trim();
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
