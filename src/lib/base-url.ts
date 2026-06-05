import { NextRequest } from "next/server";

type HeaderGetter = { get(name: string): string | null };

/** Explicit env-var base URL (works regardless of proxying), or null if none set. */
function envBaseUrl(): string | null {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.AUTH_URL ||
    process.env.COOLIFY_URL;
  return envUrl ? envUrl.replace(/\/+$/, "") : null;
}

/**
 * Resolve the public base URL from request headers — usable both from Route
 * Handlers (req.headers) and Server Actions (`await headers()`).
 *
 * Order of preference:
 *  1. An explicit env var.
 *  2. The proxy-forwarded host/proto (`x-forwarded-*`) — the real public domain
 *     behind Coolify/Nginx. The internal host would be `localhost:3000`, which
 *     is wrong for outbound links.
 *  3. localhost (last resort, dev).
 */
export function getBaseUrlFromHeaders(headers: HeaderGetter): string {
  const env = envBaseUrl();
  if (env) return env;

  const proto = headers.get("x-forwarded-proto")?.split(",")[0].trim() || "https";
  const host =
    headers.get("x-forwarded-host")?.split(",")[0].trim() ||
    headers.get("host");
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}

/**
 * Resolve the public base URL for building absolute links (e.g. in emails),
 * from a NextRequest. Falls back to the request origin when no host header.
 */
export function getBaseUrl(req: NextRequest): string {
  const env = envBaseUrl();
  if (env) return env;

  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim() || "https";
  const host =
    req.headers.get("x-forwarded-host")?.split(",")[0].trim() ||
    req.headers.get("host");
  if (host) return `${proto}://${host}`;
  return new URL(req.url).origin;
}
