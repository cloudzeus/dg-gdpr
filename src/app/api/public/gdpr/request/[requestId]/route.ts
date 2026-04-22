import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey, corsHeaders } from "@/lib/api-key";

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: await corsHeaders(req) });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  const cors = await corsHeaders(req);
  const apiKey = await validateApiKey(req);
  if (!apiKey) return NextResponse.json({ error: "Invalid or missing API key." }, { status: 401, headers: cors });

  const { requestId } = await params;
  const dsr = await prisma.dataSubjectRequest.findUnique({
    where: { id: requestId, apiKeyId: apiKey.id },
    select: { id: true, type: true, status: true, createdAt: true, completedAt: true, subjectName: true, subjectEmail: true },
  });
  if (!dsr) return NextResponse.json({ error: "Request not found." }, { status: 404, headers: cors });

  const estimatedDate = new Date(dsr.createdAt);
  estimatedDate.setDate(estimatedDate.getDate() + 30);

  return NextResponse.json({
    requestId: dsr.id,
    type: dsr.type,
    status: dsr.status,
    subjectName: dsr.subjectName,
    subjectEmail: dsr.subjectEmail,
    createdAt: dsr.createdAt.toISOString(),
    estimatedResponseDate: estimatedDate.toISOString().slice(0, 10),
    completedAt: dsr.completedAt?.toISOString() ?? null,
  }, { headers: cors });
}
