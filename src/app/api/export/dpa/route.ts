import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildDpaWord } from "@/lib/export-dpa-word";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const contract = await prisma.dpaContract.findUnique({ where: { id } });
  if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const buf = await buildDpaWord({
    title: contract.title,
    controllerName: contract.controllerName,
    processorName: contract.processorName,
    dataCategories: contract.dataCategories as string[],
    purposes: contract.purposes as string[],
    retentionPeriod: contract.retentionPeriod,
    safeguards: contract.safeguards ?? undefined,
    subProcessors: (contract.subProcessors as string[] | null) ?? undefined,
    signedAt: contract.signedAt ?? undefined,
    gdprArticles: contract.gdprArticles ?? undefined,
  });

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="dpa-${contract.controllerName}-${new Date().toISOString().slice(0, 10)}.docx"`,
    },
  });
}
