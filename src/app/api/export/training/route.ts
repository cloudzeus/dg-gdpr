import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildTrainingExcel } from "@/lib/export-excel";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const results = await prisma.trainingResult.findMany({
    orderBy: { completedAt: "desc" },
    include: {
      user: { select: { name: true, email: true, department: { select: { name: true } } } },
      module: { select: { title: true } },
    },
  });

  const buffer = await buildTrainingExcel(results);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="training-results-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
