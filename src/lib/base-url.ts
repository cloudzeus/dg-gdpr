import { NextRequest } from "next/server";

/**
 * Resolve the public base URL for building absolute links (e.g. in emails).
 *
 * Order of preference:
 *  1. An explicit env var (works regardless of proxying).
 *  2. The proxy-forwarded host/proto (`x-forwarded-*`) — the real public domain
 *     behind Coolify/Nginx. `new URL(req.url).origin` would give the internal
 *     `localhost:3000`, which is wrong for outbound links.
 *  3. The request origin (last resort, dev).
 */
export function getBaseUrl(req: NextRequest): string {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.AUTH_URL ||
    process.env.COOLIFY_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");

  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim() || "https";
  const host =
    req.headers.get("x-forwarded-host")?.split(",")[0].trim() ||
    req.headers.get("host");
  if (host && !host.startsWith("localhost") && !host.startsWith("127.0.0.1")) {
    return `${proto}://${host}`;
  }
  if (host) return `${proto}://${host}`;
  return new URL(req.url).origin;
}
