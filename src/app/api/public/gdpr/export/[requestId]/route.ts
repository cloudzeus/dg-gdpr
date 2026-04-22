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
    where: { id: requestId, apiKeyId: apiKey.id, type: "PORTABILITY" },
  });
  if (!dsr) return NextResponse.json({ error: "Portability request not found." }, { status: 404, headers: cors });
  if (dsr.status !== "COMPLETED") {
    return NextResponse.json({ error: "Export is only available once the request is completed.", status: dsr.status }, { status: 409, headers: cors });
  }

  const format = req.nextUrl.searchParams.get("format") ?? "json";
  const systems = (dsr.systems as string[] | null) ?? [];
  const payload = {
    requestId: dsr.id,
    subjectName: dsr.subjectName,
    subjectEmail: dsr.subjectEmail,
    exportedAt: new Date().toISOString(),
    systems,
    note: "Data export prepared under GDPR Article 20 — Right to Data Portability",
    data: {},
  };

  if (format === "csv") {
    const rows = [
      ["Field", "Value"],
      ["Request ID", dsr.id],
      ["Subject Name", dsr.subjectName],
      ["Subject Email", dsr.subjectEmail],
      ["Exported At", new Date().toISOString()],
      ["Systems", systems.join("; ")],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    return new NextResponse(csv, {
      headers: { ...cors, "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="gdpr-export-${requestId}.csv"` },
    });
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: { ...cors, "Content-Type": "application/json", "Content-Disposition": `attachment; filename="gdpr-export-${requestId}.json"` },
  });
}
