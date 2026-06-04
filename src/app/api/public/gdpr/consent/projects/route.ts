import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey, corsHeaders } from "@/lib/api-key";

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: await corsHeaders(req) });
}

export async function GET(req: NextRequest) {
  const cors = await corsHeaders(req);
  const apiKey = await validateApiKey(req);
  if (!apiKey) return NextResponse.json({ error: "Invalid or missing API key. Pass X-API-Key header." }, { status: 401, headers: cors });

  const projects = await prisma.consentProject.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { records: true } } },
  });
  return NextResponse.json({
    count: projects.length,
    projects: projects.map((p) => ({
      slug: p.slug,
      name: p.name,
      description: p.description,
      status: p.status,
      confirmationMethod: p.confirmationMethod,
      consentCount: p._count.records,
      createdAt: p.createdAt.toISOString(),
    })),
  }, { headers: cors });
}
