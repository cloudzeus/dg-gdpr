import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDsrAdminNotification } from "@/lib/email";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find DSRs pending > 25 days without completion (remind before 30-day deadline)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 25);

  const overdue = await prisma.dataSubjectRequest.findMany({
    where: { status: { in: ["PENDING", "IN_PROGRESS"] }, createdAt: { lte: cutoff } },
    orderBy: { createdAt: "asc" },
  });

  const results = [];
  for (const dsr of overdue) {
    try {
      await sendDsrAdminNotification({
        requestId: dsr.id,
        type: dsr.type,
        subjectName: dsr.subjectName,
        subjectEmail: dsr.subjectEmail,
        description: `⚠ ΠΡΟΣΟΧΗ: Το αίτημα εκκρεμεί ${Math.floor((Date.now() - dsr.createdAt.getTime()) / 86400000)} ημέρες. Απαιτείται άμεση ενέργεια!`,
      });
      results.push({ id: dsr.id, sent: true });
    } catch (e: any) {
      results.push({ id: dsr.id, sent: false, error: e.message });
    }
  }

  return NextResponse.json({ checked: overdue.length, results });
}
