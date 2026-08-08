"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { headers } from "next/headers";
import { getClientIp } from "@/lib/consent-token";

interface LogParams {
  action: string;
  entity: string;
  entityId?: string;
  projectId?: string;
  details?: Record<string, unknown>;
}

export async function logAction(params: LogParams): Promise<void> {
  try {
    // Το πραγματικό User.id, όχι το `session.user.id`: παλιά tokens κρατούν
    // Entra GUID, και μια εγγραφή ελέγχου που δεν δείχνει σε υπαρκτό χρήστη
    // δεν απαντά στο «ποιος το έκανε».
    const user = await getCurrentUser();
    if (!user) return;

    const hdrs = await headers();
    const ua = hdrs.get("user-agent") ?? "unknown";

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        projectId: params.projectId,
        details: params.details as any,
        ipAddress: getClientIp(hdrs),
        userAgent: ua,
      },
    });
  } catch {
    // Audit log failure must never break the main action
  }
}

