import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPolicyReviewReminder } from "@/lib/email";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);

  const policies = await prisma.policyDocument.findMany({
    where: {
      reviewDate: { lte: in30 },
      status: { in: ["ACTIVE", "DRAFT", "UNDER_REVIEW"] },
    },
    include: { owner: { select: { name: true, email: true } } },
  });

  const results: { policyId: string; title: string; sent: boolean; error?: string }[] = [];

  for (const policy of policies) {
    if (!policy.owner?.email) {
      results.push({ policyId: policy.id, title: policy.title, sent: false, error: "No owner email" });
      continue;
    }
    const daysLeft = policy.reviewDate
      ? Math.ceil((policy.reviewDate.getTime() - Date.now()) / 86400000)
      : 0;
    try {
      await sendPolicyReviewReminder({
        to: policy.owner.email,
        ownerName: policy.owner.name ?? policy.owner.email,
        policyTitle: policy.title,
        policyType: policy.type,
        reviewDate: policy.reviewDate!,
        daysLeft,
        policyId: policy.id,
      });
      results.push({ policyId: policy.id, title: policy.title, sent: true });
    } catch (e: any) {
      results.push({ policyId: policy.id, title: policy.title, sent: false, error: e.message });
    }
  }

  return NextResponse.json({ checked: policies.length, results });
}
