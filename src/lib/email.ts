const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY!;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN!;
const MAILGUN_ENDPOINT = (process.env.MAILGUN_ENDPOINT ?? "https://api.mailgun.net").replace(/\/$/, "");
const FROM = `GDPR Compliance OS <noreply@${MAILGUN_DOMAIN}>`;
const DPO_EMAIL = process.env.DPO_EMAIL ?? process.env.ADMIN_EMAIL ?? "";

async function sendMail(to: string, subject: string, html: string): Promise<void> {
  const body = new URLSearchParams({ from: FROM, to, subject, html });
  const res = await fetch(`${MAILGUN_ENDPOINT}/v3/${MAILGUN_DOMAIN}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("[Mailgun] Error:", err);
    throw new Error(`Mailgun error: ${res.status}`);
  }
}

const baseStyle = `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#201f1e;background:#f3f2f1;padding:0;margin:0;`;
const cardStyle = `background:#fff;border-radius:4px;padding:32px;max-width:600px;margin:24px auto;border:1px solid #edebe9;`;
const headerStyle = `background:#0078d4;color:#fff;padding:16px 32px;border-radius:4px 4px 0 0;font-size:13px;font-weight:600;`;
const footerStyle = `color:#8a8886;font-size:11px;text-align:center;padding:16px;`;
const badgeStyle = (color: string) => `display:inline-block;padding:4px 10px;border-radius:4px;font-size:12px;font-weight:600;background:${color};`;

function layout(headerText: string, body: string): string {
  return `<html><body style="${baseStyle}">
<div style="${headerStyle}">${headerText}</div>
<div style="${cardStyle}">${body}</div>
<div style="${footerStyle}">GDPR Compliance OS · Αυτόματο μήνυμα — Παρακαλώ μη απαντάτε σε αυτό το email.</div>
</body></html>`;
}

// ─── Policy review reminder ───────────────────────────────────────────────────

export async function sendPolicyReviewReminder(opts: {
  to: string;
  ownerName: string;
  policyTitle: string;
  policyType: string;
  reviewDate: Date;
  daysLeft: number;
  policyId: string;
}) {
  const { to, ownerName, policyTitle, reviewDate, daysLeft, policyId } = opts;
  const urgent = daysLeft <= 7;
  const subject = urgent
    ? `⚠ ΕΠΕΙΓΟΝ: Αναθεώρηση πολιτικής «${policyTitle}» εκπνέει σε ${daysLeft} ημέρες`
    : `Υπενθύμιση αναθεώρησης πολιτικής: «${policyTitle}»`;

  const html = layout("📋 Υπενθύμιση Αναθεώρησης Πολιτικής", `
    <p style="margin:0 0 16px">Αγαπητέ/ή <strong>${ownerName}</strong>,</p>
    <p style="margin:0 0 16px">Η παρακάτω πολιτική απαιτεί αναθεώρηση${urgent ? " <strong>άμεσα</strong>" : ""}:</p>
    <div style="background:#f3f2f1;border-radius:4px;padding:16px;margin:0 0 20px">
      <p style="margin:0 0 8px;font-size:16px;font-weight:600">${policyTitle}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#605e5c">Ημ. Αναθεώρησης: <strong>${reviewDate.toLocaleDateString("el-GR")}</strong></p>
      <p style="margin:0;font-size:13px">
        <span style="${badgeStyle(urgent ? "#fde7e9" : "#fff4ce")} color:${urgent ? "#d83b01" : "#ca5010"}">
          ${daysLeft > 0 ? `${daysLeft} ημέρες απομένουν` : "ΕΚΠΡΟΘΕΣΜΟ"}
        </span>
      </p>
    </div>
    <p style="margin:0 0 20px;font-size:13px;color:#605e5c">
      Παρακαλούμε να αναθεωρήσετε και να ενημερώσετε την πολιτική στο σύστημα GDPR Compliance OS.
    </p>
    <a href="${process.env.NEXTAUTH_URL}/admin/policies" style="display:inline-block;background:#0078d4;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:600">
      Προβολή Πολιτικής
    </a>
  `);

  await sendMail(to, subject, html);
}

// ─── DSR — confirmation to data subject ──────────────────────────────────────

const DSR_TYPE_LABELS: Record<string, string> = {
  ERASURE: "Δικαίωμα Διαγραφής (Άρθρο 17)",
  PORTABILITY: "Δικαίωμα Φορητότητας Δεδομένων (Άρθρο 20)",
  ACCESS: "Δικαίωμα Πρόσβασης (Άρθρο 15)",
  RECTIFICATION: "Δικαίωμα Διόρθωσης (Άρθρο 16)",
  OBJECTION: "Δικαίωμα Εναντίωσης (Άρθρο 21)",
  RESTRICTION: "Δικαίωμα Περιορισμού Επεξεργασίας (Άρθρο 18)",
  WITHDRAW_CONSENT: "Ανάκληση Συγκατάθεσης (Άρθρο 7(3))",
};

export async function sendDsrConfirmation(opts: {
  to: string;
  subjectName: string;
  requestId: string;
  type: string;
  estimatedDate: Date;
}) {
  const { to, subjectName, requestId, type, estimatedDate } = opts;
  const typeName = DSR_TYPE_LABELS[type] ?? type;

  const html = layout("✅ Επιβεβαίωση Λήψης Αιτήματος GDPR", `
    <p style="margin:0 0 16px">Αγαπητέ/ή <strong>${subjectName}</strong>,</p>
    <p style="margin:0 0 16px">Λάβαμε το αίτημά σας και θα το επεξεργαστούμε το συντομότερο δυνατό.</p>
    <div style="background:#f3f2f1;border-radius:4px;padding:16px;margin:0 0 20px">
      <p style="margin:0 0 6px;font-size:13px"><strong>Τύπος αιτήματος:</strong> ${typeName}</p>
      <p style="margin:0 0 6px;font-size:13px"><strong>Αριθμός αιτήματος:</strong> <code style="background:#edebe9;padding:2px 6px;border-radius:2px;font-size:12px">${requestId}</code></p>
      <p style="margin:0;font-size:13px"><strong>Εκτιμώμενη ολοκλήρωση:</strong> ${estimatedDate.toLocaleDateString("el-GR")} (εντός 30 ημερών)</p>
    </div>
    <p style="margin:0 0 16px;font-size:13px;color:#605e5c">
      Σύμφωνα με τον GDPR, υποχρεούμαστε να απαντήσουμε στο αίτημά σας εντός <strong>30 ημερολογιακών ημερών</strong>.
      Διατηρούμε το δικαίωμα παράτασης έως 60 ημέρες επιπλέον σε περίπτωση πολυπλοκότητας,
      για την οποία θα σας ενημερώσουμε.
    </p>
    <p style="margin:0;font-size:12px;color:#8a8886">Αριθμός αναφοράς: <strong>${requestId}</strong></p>
  `);

  await sendMail(to, `Επιβεβαίωση αιτήματος GDPR #${requestId.slice(-8).toUpperCase()}`, html);
}

// ─── DSR — notification to DPO/admin ─────────────────────────────────────────

export async function sendDsrAdminNotification(opts: {
  requestId: string;
  type: string;
  subjectName: string;
  subjectEmail: string;
  description?: string;
}) {
  const { requestId, type, subjectName, subjectEmail, description } = opts;
  const typeName = DSR_TYPE_LABELS[type] ?? type;
  if (!DPO_EMAIL) return;

  const html = layout("🔔 Νέο Αίτημα Άσκησης Δικαιώματος GDPR", `
    <p style="margin:0 0 16px">Ελήφθη νέο αίτημα άσκησης δικαιώματος μέσω του δημόσιου API:</p>
    <div style="background:#f3f2f1;border-radius:4px;padding:16px;margin:0 0 20px">
      <p style="margin:0 0 6px;font-size:13px"><strong>Αίτηση:</strong> ${typeName}</p>
      <p style="margin:0 0 6px;font-size:13px"><strong>Υποκείμενο:</strong> ${subjectName}</p>
      <p style="margin:0 0 6px;font-size:13px"><strong>Email:</strong> ${subjectEmail}</p>
      ${description ? `<p style="margin:0 0 6px;font-size:13px"><strong>Περιγραφή:</strong> ${description}</p>` : ""}
      <p style="margin:0;font-size:13px"><strong>ID:</strong> <code style="background:#edebe9;padding:2px 6px;border-radius:2px;font-size:12px">${requestId}</code></p>
    </div>
    <p style="margin:0 0 20px;font-size:13px;color:#d83b01;font-weight:600">
      ⚠ Υποχρέωση απάντησης εντός 30 ημερών από τη λήψη (GDPR Άρθρο 12).
    </p>
    <a href="${process.env.NEXTAUTH_URL}/admin/dsr" style="display:inline-block;background:#0078d4;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:600">
      Διαχείριση Αιτήματος
    </a>
  `);

  await sendMail(DPO_EMAIL, `[GDPR] Νέο αίτημα ${typeName} από ${subjectName}`, html);
}

// ─── DSR — completion notification to subject ─────────────────────────────────

export async function sendDsrCompleted(opts: {
  to: string;
  subjectName: string;
  requestId: string;
  type: string;
  responseText?: string;
}) {
  const { to, subjectName, requestId, type, responseText } = opts;
  const typeName = DSR_TYPE_LABELS[type] ?? type;

  const html = layout("✅ Ολοκλήρωση Αιτήματος GDPR", `
    <p style="margin:0 0 16px">Αγαπητέ/ή <strong>${subjectName}</strong>,</p>
    <p style="margin:0 0 16px">Το αίτημά σας έχει ολοκληρωθεί:</p>
    <div style="background:#dff6dd;border:1px solid #107c10;border-radius:4px;padding:16px;margin:0 0 20px">
      <p style="margin:0 0 6px;font-size:13px"><strong>Τύπος:</strong> ${typeName}</p>
      <p style="margin:0;font-size:13px"><strong>ID:</strong> ${requestId}</p>
    </div>
    ${responseText ? `<div style="background:#f3f2f1;border-radius:4px;padding:16px;margin:0 0 16px;font-size:13px;line-height:1.6">${responseText}</div>` : ""}
    <p style="margin:0;font-size:12px;color:#8a8886">
      Εάν έχετε ερωτήσεις, μπορείτε να επικοινωνήσετε με τον Υπεύθυνο Προστασίας Δεδομένων (DPO).
    </p>
  `);

  await sendMail(to, `Ολοκλήρωση αιτήματος GDPR #${requestId.slice(-8).toUpperCase()}`, html);
}

// ─── Erasure — admin notification ────────────────────────────────────────────

export async function sendErasureNotification(opts: {
  requestId: string;
  subjectName: string;
  subjectEmail: string;
  systems: string[];
  description: string;
}) {
  const { requestId, subjectName, subjectEmail, systems, description } = opts;
  if (!DPO_EMAIL) return;

  const html = layout("🗑 Νέο Αίτημα Διαγραφής Δεδομένων (Άρθρο 17)", `
    <p style="margin:0 0 16px">Ελήφθη νέο αίτημα δικαιώματος λήθης:</p>
    <div style="background:#fde7e9;border:1px solid #d83b01;border-radius:4px;padding:16px;margin:0 0 20px">
      <p style="margin:0 0 6px;font-size:13px"><strong>Υποκείμενο:</strong> ${subjectName} (${subjectEmail})</p>
      <p style="margin:0 0 6px;font-size:13px"><strong>Συστήματα:</strong> ${systems.join(", ")}</p>
      <p style="margin:0 0 6px;font-size:13px"><strong>Αιτιολόγηση:</strong> ${description}</p>
      <p style="margin:0;font-size:13px"><strong>ID:</strong> ${requestId}</p>
    </div>
    <p style="margin:0 0 20px;font-size:13px;font-weight:600;color:#d83b01">
      ⚠ Νομική υποχρέωση διεκπεραίωσης εντός 30 ημερών (Άρθρο 12 GDPR).
    </p>
    <a href="${process.env.NEXTAUTH_URL}/erasure" style="display:inline-block;background:#d83b01;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:600">
      Διαχείριση Αιτήματος Διαγραφής
    </a>
  `);

  await sendMail(DPO_EMAIL, `[GDPR] Αίτημα Διαγραφής — ${subjectName}`, html);
}
