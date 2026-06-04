import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey, corsHeaders } from "@/lib/api-key";
import type { PolicyStatus, PolicyType } from "@prisma/client";

const VALID_STATUS: PolicyStatus[] = ["DRAFT", "UNDER_REVIEW", "ACTIVE", "ARCHIVED"];
const VALID_TYPE: PolicyType[] = [
  "SECURITY_POLICY", "ACCEPTABLE_USE", "DATA_RETENTION", "INCIDENT_RESPONSE", "BYOD",
  "PASSWORD_POLICY", "BACKUP", "ACCESS_CONTROL", "PRIVACY_NOTICE", "COOKIE_POLICY",
  "DATA_BREACH", "EMPLOYEE_HANDBOOK", "ETHICS_CODE", "CLEAR_DESK", "REMOTE_WORK",
  "VENDOR_MANAGEMENT", "CHANGE_MANAGEMENT", "BUSINESS_CONTINUITY", "OTHER",
];

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: await corsHeaders(req) });
}

export async function GET(req: NextRequest) {
  const cors = await corsHeaders(req);

  const apiKey = await validateApiKey(req);
  if (!apiKey) {
    return NextResponse.json({ error: "Invalid or missing API key. Pass X-API-Key header." }, { status: 401, headers: cors });
  }

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status")?.toUpperCase();
  const typeParam = searchParams.get("type")?.toUpperCase();

  if (statusParam && statusParam !== "ALL" && !VALID_STATUS.includes(statusParam as PolicyStatus)) {
    return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUS.join(", ")} or ALL.` }, { status: 400, headers: cors });
  }
  if (typeParam && !VALID_TYPE.includes(typeParam as PolicyType)) {
    return NextResponse.json({ error: `Invalid type. Must be one of: ${VALID_TYPE.join(", ")}` }, { status: 400, headers: cors });
  }

  // Default: only ACTIVE policies. Pass ?status=ALL to include every status.
  const where: { status?: PolicyStatus; type?: PolicyType } = {};
  if (statusParam === "ALL") {
    // no status filter
  } else {
    where.status = (statusParam as PolicyStatus) ?? "ACTIVE";
  }
  if (typeParam) where.type = typeParam as PolicyType;

  const policies = await prisma.policyDocument.findMany({
    where,
    orderBy: [{ type: "asc" }, { title: "asc" }],
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
    },
  });

  return NextResponse.json({
    count: policies.length,
    policies: policies.map((p) => ({
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
    })),
  }, { headers: cors });
}
