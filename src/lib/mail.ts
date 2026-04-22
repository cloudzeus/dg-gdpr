const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_BASE = process.env.MAILGUN_BASE_URL ?? "https://api.eu.mailgun.net/v3";
const MAIL_FROM = process.env.MAIL_FROM ?? `GDPR OS <no-reply@${MAILGUN_DOMAIN ?? "example.com"}>`;

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export async function sendMail(msg: MailMessage): Promise<{ id: string } | null> {
  if (!MAILGUN_DOMAIN || !MAILGUN_API_KEY) {
    console.warn("[mail] Mailgun not configured — skipping send", msg.to);
    return null;
  }

  const body = new FormData();
  body.append("from", MAIL_FROM);
  body.append("to", msg.to);
  body.append("subject", msg.subject);
  body.append("html", msg.html);
  if (msg.text) body.append("text", msg.text);
  if (msg.replyTo) body.append("h:Reply-To", msg.replyTo);

  const res = await fetch(`${MAILGUN_BASE}/${MAILGUN_DOMAIN}/messages`, {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`api:${MAILGUN_API_KEY}`).toString("base64") },
    body,
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Mailgun ${res.status}: ${detail}`);
  }

  const data = (await res.json()) as { id: string };
  return data;
}

export function trainingResultEmail(params: {
  userName: string;
  moduleTitle: string;
  score: number;
  passed: boolean;
  passingScore: number;
  completedAt: Date;
}): { subject: string; html: string; text: string } {
  const { userName, moduleTitle, score, passed, passingScore, completedAt } = params;
  const color = passed ? "#16a34a" : "#dc2626";
  const status = passed ? "Επιτυχής ολοκλήρωση" : "Δεν επιτεύχθηκε η ελάχιστη βαθμολογία";
  const date = completedAt.toLocaleDateString("el-GR");

  const subject = `[GDPR OS] Αποτελέσματα εκπαίδευσης: ${moduleTitle}`;
  const html = `<!doctype html>
<html><body style="font-family:Segoe UI,Arial,sans-serif;background:#f3f2f1;padding:24px;color:#201f1e">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #edebe9;border-radius:6px;overflow:hidden">
    <div style="background:#0078d4;color:#fff;padding:16px 20px;font-weight:600">GDPR Compliance OS</div>
    <div style="padding:20px">
      <p style="margin:0 0 10px">Γεια σας ${userName},</p>
      <p>Ολοκληρώσατε την εκπαίδευση <strong>${moduleTitle}</strong> στις ${date}.</p>
      <div style="border:1px solid #edebe9;border-radius:4px;padding:16px;margin:16px 0;text-align:center">
        <p style="margin:0;font-size:36px;font-weight:700;color:${color}">${Math.round(score)}%</p>
        <p style="margin:4px 0 0;color:${color};font-weight:600">${status}</p>
        <p style="margin:4px 0 0;color:#605e5c;font-size:12px">Ελάχιστη βαθμολογία επιτυχίας: ${passingScore}%</p>
      </div>
      <p style="color:#605e5c;font-size:13px">Συνδεθείτε στην πλατφόρμα για το ιστορικό βαθμολογιών και το επόμενο module.</p>
    </div>
    <div style="padding:10px 20px;border-top:1px solid #edebe9;color:#605e5c;font-size:11px">© DG Smart · GDPR Compliance OS</div>
  </div>
</body></html>`;

  const text = `Αποτελέσματα εκπαίδευσης: ${moduleTitle}\nΧρήστης: ${userName}\nΒαθμολογία: ${Math.round(score)}%\nΚατάσταση: ${status}\nΗμερομηνία: ${date}`;

  return { subject, html, text };
}
