import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { randomBytes } from "crypto";

export function generateApiKey(): string {
  return `gdpr_${randomBytes(24).toString("hex")}`;
}

export async function validateApiKey(req: NextRequest) {
  const key = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  if (!key) return null;
  const record = await prisma.apiKey.findUnique({ where: { key, isActive: true } });
  return record ?? null;
}

export async function corsHeaders(req: NextRequest, apiKeyId?: string): Promise<HeadersInit> {
  const origin = req.headers.get("origin") ?? "*";
  // Check allowed origins if configured
  if (apiKeyId) {
    const key = await prisma.apiKey.findUnique({ where: { id: apiKeyId } });
    const allowed = key?.allowedOrigins as string[] | null;
    if (allowed && allowed.length > 0 && !allowed.includes(origin) && !allowed.includes("*")) {
      return {};
    }
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}
