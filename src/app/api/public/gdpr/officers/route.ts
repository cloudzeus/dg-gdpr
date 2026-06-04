import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey, corsHeaders } from "@/lib/api-key";
import type { UserRole } from "@prisma/client";

// The three GDPR/security governance roles. CISO maps to SECURITY_OFFICER.
const OFFICER_ROLES: UserRole[] = ["DPO", "SECURITY_OFFICER", "COMPLIANCE_OFFICER"];

const ROLE_LABEL: Record<string, { el: string; en: string }> = {
  DPO: { el: "Υπεύθυνος Προστασίας Δεδομένων (DPO)", en: "Data Protection Officer" },
  SECURITY_OFFICER: { el: "Υπεύθυνος Ασφάλειας Πληροφοριών (CISO)", en: "Chief Information Security Officer" },
  COMPLIANCE_OFFICER: { el: "Υπεύθυνος Συμμόρφωσης", en: "Compliance Officer" },
};

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: await corsHeaders(req) });
}

// GET /officers — list the DPO, CISO (Security Officer) and Compliance Officer.
// Optional: ?role=DPO|SECURITY_OFFICER|COMPLIANCE_OFFICER  ·  ?includeInactive=true
export async function GET(req: NextRequest) {
  const cors = await corsHeaders(req);

  const apiKey = await validateApiKey(req);
  if (!apiKey) {
    return NextResponse.json({ error: "Invalid or missing API key. Pass X-API-Key header." }, { status: 401, headers: cors });
  }

  const { searchParams } = new URL(req.url);
  const roleParam = searchParams.get("role")?.toUpperCase();
  const includeInactive = searchParams.get("includeInactive") === "true";

  if (roleParam && !OFFICER_ROLES.includes(roleParam as UserRole)) {
    return NextResponse.json({ error: `Invalid role. Must be one of: ${OFFICER_ROLES.join(", ")}` }, { status: 400, headers: cors });
  }

  const roles = roleParam ? [roleParam as UserRole] : OFFICER_ROLES;

  const users = await prisma.user.findMany({
    where: {
      role: { in: roles },
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      department: { select: { name: true } },
      position: { select: { title: true } },
    },
  });

  return NextResponse.json({
    count: users.length,
    officers: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone ?? null,
      role: u.role,
      roleLabel: ROLE_LABEL[u.role]?.el ?? u.role,
      roleLabelEn: ROLE_LABEL[u.role]?.en ?? u.role,
      department: u.department?.name ?? null,
      position: u.position?.title ?? null,
      isActive: u.isActive,
    })),
  }, { headers: cors });
}
