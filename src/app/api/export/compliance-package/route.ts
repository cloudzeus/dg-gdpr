import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildCompliancePackageWord } from "@/lib/export-compliance-word";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [org, policies] = await Promise.all([
    prisma.organization.findFirst(),
    prisma.policyDocument.findMany({
      where: { status: "ACTIVE", content: { not: null } },
      orderBy: [{ type: "asc" }, { title: "asc" }],
      select: {
        title: true,
        type: true,
        version: true,
        status: true,
        content: true,
        effectiveDate: true,
        reviewDate: true,
      },
    }),
  ]);

  if (!org) return NextResponse.json({ error: "Organization not configured" }, { status: 400 });

  const buf = await buildCompliancePackageWord(
    {
      name: org.name,
      legalName: org.legalName,
      vatNumber: org.vatNumber,
      taxOffice: org.taxOffice,
      registryNo: org.registryNo,
      addressLine1: org.addressLine1,
      addressLine2: org.addressLine2,
      city: org.city,
      postalCode: org.postalCode,
      country: org.country,
      website: org.website,
      description: org.description,
      phones: (org.phones as any) ?? [],
      emails: (org.emails as any) ?? [],
    },
    policies
  );

  const safeName = org.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase().slice(0, 30);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="gdpr-compliance-package-${safeName}-${date}.docx"`,
    },
  });
}
