import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey, corsHeaders } from "@/lib/api-key";

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: await corsHeaders(req) });
}

// GET /ropa — list the full Record of Processing Activities (Άρθρο 30), grouped per department.
export async function GET(req: NextRequest) {
  const cors = await corsHeaders(req);

  const apiKey = await validateApiKey(req);
  if (!apiKey) {
    return NextResponse.json({ error: "Invalid or missing API key. Pass X-API-Key header." }, { status: 401, headers: cors });
  }

  const { searchParams } = new URL(req.url);
  const departmentFilter = searchParams.get("department")?.trim();

  const flows = await prisma.departmentFlow.findMany({
    where: departmentFilter ? { department: departmentFilter } : undefined,
    orderBy: { department: "asc" },
    select: { id: true, department: true, icon: true, entries: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({
    count: flows.length,
    departments: flows.map((f) => ({
      id: f.id,
      department: f.department,
      icon: f.icon ?? null,
      entries: f.entries ?? [],
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    })),
  }, { headers: cors });
}

// POST /ropa — upsert the processing activities of a department from an external application.
// Body: { department: string, icon?: string, entries: array }
// Behaviour: if the department exists it is fully replaced (idempotent); otherwise it is created.
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

  const { department, icon, entries } = body;

  if (!department || typeof department !== "string" || !department.trim()) {
    return NextResponse.json({ error: "department is required (non-empty string)." }, { status: 400, headers: cors });
  }
  if (!Array.isArray(entries)) {
    return NextResponse.json({ error: "entries is required and must be an array of processing activities." }, { status: 400, headers: cors });
  }
  if (icon != null && typeof icon !== "string") {
    return NextResponse.json({ error: "icon must be a string when provided." }, { status: 400, headers: cors });
  }

  const dept = department.trim();
  const existing = await prisma.departmentFlow.findUnique({ where: { department: dept }, select: { id: true } });

  const flow = await prisma.departmentFlow.upsert({
    where: { department: dept },
    create: { department: dept, icon: icon?.trim() ?? null, entries },
    update: { icon: icon?.trim() ?? null, entries },
    select: { id: true, department: true, icon: true, entries: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({
    id: flow.id,
    department: flow.department,
    icon: flow.icon ?? null,
    entries: flow.entries ?? [],
    entryCount: Array.isArray(flow.entries) ? flow.entries.length : 0,
    created: !existing,
    updatedAt: flow.updatedAt.toISOString(),
    message: existing
      ? `Το αρχείο δραστηριοτήτων του τμήματος "${flow.department}" ενημερώθηκε.`
      : `Το αρχείο δραστηριοτήτων του τμήματος "${flow.department}" δημιουργήθηκε.`,
  }, { status: existing ? 200 : 201, headers: cors });
}
