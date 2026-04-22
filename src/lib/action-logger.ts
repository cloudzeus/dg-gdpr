"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

interface LogParams {
  action: string;
  entity: string;
  entityId?: string;
  projectId?: string;
  details?: Record<string, unknown>;
}

export async function logAction(params: LogParams): Promise<void> {
  try {
    const session = await auth();
    if (!session?.user?.id) return;

    const hdrs = await headers();
    const ip = hdrs.get("x-forwarded-for") ?? hdrs.get("x-real-ip") ?? "unknown";
    const ua = hdrs.get("user-agent") ?? "unknown";

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        projectId: params.projectId,
        details: params.details as any,
        ipAddress: ip.split(",")[0].trim(),
        userAgent: ua,
      },
    });
  } catch {
    // Audit log failure must never break the main action
  }
}

