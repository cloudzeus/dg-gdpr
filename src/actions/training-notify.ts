"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendMail } from "@/lib/mail";

function htmlSnippet(html: string | null, maxLen = 220): string {
  if (!html) return "";
  const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return plain.length > maxLen ? plain.slice(0, maxLen) + "…" : plain;
}

function notificationEmail(params: {
  userName: string;
  moduleTitle: string;
  moduleDescription: string | null;
  sections: { title: string; body: string | null }[];
  customMessage: string;
  deadline: string | null;
  loginUrl: string;
}): { subject: string; html: string } {
  const { userName, moduleTitle, moduleDescription, sections, customMessage, deadline, loginUrl } = params;

  const sectionsHtml = sections
    .map(
      (s) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #edebe9">
          <p style="margin:0 0 4px;font-weight:600;color:#201f1e">${s.title}</p>
          ${s.body ? `<p style="margin:0;color:#605e5c;font-size:13px">${htmlSnippet(s.body)}</p>` : ""}
        </td>
      </tr>`
    )
    .join("");

  const deadlineRow = deadline
    ? `<p style="margin:16px 0 0;padding:10px 12px;background:#fff4ce;border-left:3px solid #ca8a04;border-radius:2px;font-size:13px">
        <strong>Προθεσμία:</strong> ${deadline}
       </p>`
    : "";

  const html = `<!doctype html>
<html><body style="font-family:Segoe UI,Arial,sans-serif;background:#f3f2f1;padding:24px;color:#201f1e;margin:0">
  <div style="max-width:580px;margin:0 auto;background:#fff;border:1px solid #edebe9;border-radius:6px;overflow:hidden">
    <div style="background:#0078d4;color:#fff;padding:16px 24px">
      <p style="margin:0;font-size:11px;opacity:0.8;text-transform:uppercase;letter-spacing:1px">GDPR Compliance OS</p>
      <p style="margin:4px 0 0;font-size:18px;font-weight:600">Υποχρεωτική Εκπαίδευση GDPR</p>
    </div>
    <div style="padding:24px">
      <p style="margin:0 0 12px">Αγαπητέ/ή <strong>${userName}</strong>,</p>
      <p style="margin:0 0 16px;color:#605e5c">${customMessage}</p>

      <div style="background:#f3f2f1;border-radius:4px;padding:16px;margin:0 0 20px">
        <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#605e5c">Ενότητα Εκπαίδευσης</p>
        <p style="margin:0;font-size:17px;font-weight:700;color:#0078d4">${moduleTitle}</p>
        ${moduleDescription ? `<p style="margin:6px 0 0;font-size:13px;color:#605e5c">${moduleDescription}</p>` : ""}
      </div>

      ${sections.length > 0 ? `
      <p style="margin:0 0 8px;font-weight:600">Περιεχόμενο ενοτήτων:</p>
      <table style="width:100%;border-collapse:collapse">
        ${sectionsHtml}
      </table>` : ""}

      ${deadlineRow}

      <div style="margin:24px 0 0;text-align:center">
        <a href="${loginUrl}" style="display:inline-block;background:#0078d4;color:#fff;text-decoration:none;padding:12px 28px;border-radius:4px;font-weight:600;font-size:14px">
          Σύνδεση & Έναρξη Εκπαίδευσης →
        </a>
      </div>

      <p style="margin:20px 0 0;color:#a19f9d;font-size:12px">
        Η εκπαίδευση GDPR είναι υποχρεωτική βάσει του Κανονισμού (ΕΕ) 2016/679 (Άρθρο 39) και των απαιτήσεων λογοδοσίας (Άρθρο 5§2). Η μη συμμετοχή καταγράφεται στο σύστημα συμμόρφωσης.
      </p>
    </div>
    <div style="padding:10px 24px;border-top:1px solid #edebe9;color:#a19f9d;font-size:11px">
      © DG Smart · GDPR Compliance OS · Αυτόματο μήνυμα — μην απαντάτε
    </div>
  </div>
</body></html>`;

  return {
    subject: `[GDPR OS] Υποχρεωτική εκπαίδευση: ${moduleTitle}`,
    html,
  };
}

export async function sendTrainingNotification(input: {
  moduleId: string;
  targetType: "all" | "department" | "users";
  departmentId?: string | null;
  userIds?: string[];
  customMessage: string;
  deadline: string | null;
}): Promise<{ sent: number; skipped: number }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Μη εξουσιοδοτημένος");

  // Fetch module with sections
  const module = await prisma.trainingModule.findUnique({
    where: { id: input.moduleId },
    include: {
      sections: { orderBy: { order: "asc" }, select: { title: true, body: true } },
    },
  });
  if (!module) throw new Error("Δεν βρέθηκε η ενότητα εκπαίδευσης");

  // Determine target users
  let users: { id: string; name: string | null; email: string | null }[] = [];

  if (input.targetType === "all") {
    users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
    });
  } else if (input.targetType === "department" && input.departmentId) {
    users = await prisma.user.findMany({
      where: { isActive: true, departmentId: input.departmentId },
      select: { id: true, name: true, email: true },
    });
  } else if (input.targetType === "users" && input.userIds?.length) {
    users = await prisma.user.findMany({
      where: { id: { in: input.userIds }, isActive: true },
      select: { id: true, name: true, email: true },
    });
  }

  const baseUrl = (process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "https://gdpr.dgsmart.gr").replace(/\/$/, "");
  const loginUrl = `${baseUrl}/training/${module.id}`;
  let sent = 0;
  let skipped = 0;

  await Promise.allSettled(
    users.map(async (u) => {
      if (!u.email) { skipped++; return; }
      const { subject, html } = notificationEmail({
        userName: u.name ?? u.email,
        moduleTitle: module.title,
        moduleDescription: module.description,
        sections: module.sections,
        customMessage: input.customMessage,
        deadline: input.deadline,
        loginUrl,
      });
      await sendMail({ to: u.email, subject, html });
      sent++;
    })
  );

  return { sent, skipped };
}
