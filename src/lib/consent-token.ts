import { randomBytes } from "crypto";

export function generateConsentToken(): string {
  return randomBytes(32).toString("hex");
}

// NOTE: IP is read from x-forwarded-for / x-real-ip and is only trustworthy when
// the app runs behind a trusted reverse proxy that sets these headers reliably.
export function getClientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
