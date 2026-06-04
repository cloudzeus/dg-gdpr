import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey, corsHeaders } from "@/lib/api-key";

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: await corsHeaders(req) });
}

// GET /consent/projects/[slug]/records?status=CONFIRMED — JSON of all consents for the project.
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const cors = await corsHeaders(req);
  const apiKey = await validateApiKey(req);
  if (!apiKey) return NextResponse.json({ error: "Invalid or missing API key. Pass X-API-Key header." }, { status: 401, headers: cors });

  const { slug } = await params;
  const project = await prisma.consentProject.findUnique({ where: { slug } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404, headers: cors });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as "PENDING" | "CONFIRMED" | "WITHDRAWN" | null;

  const records = await prisma.consentRecord.findMany({
    where: { projectId: project.id, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    project: { slug: project.slug, name: project.name },
    count: records.length,
    records: records.map((r) => ({
      id: r.id,
      subjectEmail: r.subjectEmail,
      subjectPhone: r.subjectPhone,
      values: r.values,
      purposeConsents: r.purposeConsents,
      status: r.status,
      confirmedAt: r.confirmedAt?.toISOString() ?? null,
      ipAddress: r.ipAddress,
      withdrawnAt: r.withdrawnAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  }, { headers: cors });
}
