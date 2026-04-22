import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey, corsHeaders } from "@/lib/api-key";
import { sendDsrConfirmation, sendDsrAdminNotification } from "@/lib/email";
import type { DsrType } from "@prisma/client";

const VALID_TYPES: DsrType[] = ["ERASURE", "PORTABILITY", "ACCESS", "RECTIFICATION", "OBJECTION", "RESTRICTION", "WITHDRAW_CONSENT"];

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: await corsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const cors = await corsHeaders(req);

  const apiKey = await validateApiKey(req);
  if (!apiKey) {
    return NextResponse.json({ error: "Invalid or missing API key. Pass X-API-Key header." }, { status: 401, headers: cors });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400, headers: cors });
  }

  const { type, subjectName, subjectEmail, subjectPhone, description, systems } = body;

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({
      error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}`,
    }, { status: 400, headers: cors });
  }
  if (!subjectName?.trim()) return NextResponse.json({ error: "subjectName is required." }, { status: 400, headers: cors });
  if (!subjectEmail?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(subjectEmail)) {
    return NextResponse.json({ error: "Valid subjectEmail is required." }, { status: 400, headers: cors });
  }

  const dsr = await prisma.dataSubjectRequest.create({
    data: {
      apiKeyId: apiKey.id,
      type: type as DsrType,
      subjectName: subjectName.trim(),
      subjectEmail: subjectEmail.trim().toLowerCase(),
      subjectPhone: subjectPhone?.trim() ?? null,
      description: description?.trim() ?? null,
      systems: systems ?? null,
    },
  });

  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + 30);

  // Fire-and-forget emails
  sendDsrConfirmation({ to: dsr.subjectEmail, subjectName: dsr.subjectName, requestId: dsr.id, type: dsr.type, estimatedDate }).catch(console.error);
  sendDsrAdminNotification({ requestId: dsr.id, type: dsr.type, subjectName: dsr.subjectName, subjectEmail: dsr.subjectEmail, description: description?.trim() }).catch(console.error);

  return NextResponse.json({
    requestId: dsr.id,
    type: dsr.type,
    status: dsr.status,
    message: "Το αίτημά σας ελήφθη. Θα λάβετε email επιβεβαίωσης εντός ολίγων λεπτών.",
    estimatedResponseDate: estimatedDate.toISOString().slice(0, 10),
  }, { status: 201, headers: cors });
}
