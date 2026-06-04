import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey, corsHeaders } from "@/lib/api-key";

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: await corsHeaders(req) });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cors = await corsHeaders(req);

  const apiKey = await validateApiKey(req);
  if (!apiKey) {
    return NextResponse.json({ error: "Invalid or missing API key." }, { status: 401, headers: cors });
  }

  const { id } = await params;
  const p = await prisma.policyDocument.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      type: true,
      version: true,
      content: true,
      fileUrl: true,
      status: true,
      effectiveDate: true,
      reviewDate: true,
      tags: true,
      createdAt: true,
      updatedAt: true,
      owner: { select: { name: true, email: true } },
      versions: {
        orderBy: { createdAt: "desc" },
        select: { version: true, changeNote: true, changedBy: true, createdAt: true },
      },
    },
  });

  if (!p) return NextResponse.json({ error: "Policy not found." }, { status: 404, headers: cors });

  return NextResponse.json({
    id: p.id,
    title: p.title,
    type: p.type,
    version: p.version,
    status: p.status,
    content: p.content ?? null,
    fileUrl: p.fileUrl ?? null,
    tags: p.tags ?? null,
    owner: p.owner ? { name: p.owner.name, email: p.owner.email } : null,
    effectiveDate: p.effectiveDate?.toISOString().slice(0, 10) ?? null,
    reviewDate: p.reviewDate?.toISOString().slice(0, 10) ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    history: p.versions.map((v) => ({
      version: v.version,
      changeNote: v.changeNote ?? null,
      changedBy: v.changedBy ?? null,
      createdAt: v.createdAt.toISOString(),
    })),
  }, { headers: cors });
}
