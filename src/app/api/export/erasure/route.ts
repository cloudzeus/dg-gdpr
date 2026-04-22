import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildErasureExcel } from "@/lib/export-excel";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requests = await prisma.erasureRequest.findMany({
    orderBy: { requestDate: "desc" },
  });

  const buffer = await buildErasureExcel(requests);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="erasure-requests-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
