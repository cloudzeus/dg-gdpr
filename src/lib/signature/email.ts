/* ──────────────────────────────────────────────────────────────────────────
   Signature workflow email templates — DG design system (Fluent 2 + DG brand).
   Same house style as src/lib/consent-email.ts: table layout, inline styles,
   bulletproof (VML) button, email-client-safe.
   ──────────────────────────────────────────────────────────────────────── */

const BLUE = "#0078D4";
const BLUE_DARK = "#106EBE";
const RED = "#E31E2A";
const INK = "#201F1E";
const MUTED = "#605E5C";
const BORDER = "#EDEBE9";
const BG = "#FAF9F8";
const WARN_BG = "#FFF4CE";
const WARN_BORDER = "#F7D26A";
const WARN_TEXT = "#7A5B00";
const FONT = `-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;

/** Bulletproof button that also renders in Outlook (VML). */
function button(href: string, label: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0">
    <tr><td align="center" bgcolor="${BLUE}" style="border-radius:4px">
      <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:44px;v-text-anchor:middle;width:280px;" arcsize="9%" strokecolor="${BLUE}" fillcolor="${BLUE}"><w:anchorlock/><center style="color:#ffffff;font-family:${FONT};font-size:15px;font-weight:600;">${label}</center></v:roundrect><![endif]-->
      <!--[if !mso]><!-- -->
      <a href="${href}" style="display:inline-block;padding:13px 28px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:4px;background:${BLUE}">${label}</a>
      <!--<![endif]-->
    </td></tr>
  </table>`;
}

/** Subtle info note box. */
function note(text: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0">
    <tr><td style="background:${BG};border:1px solid ${BORDER};border-radius:8px;padding:12px 14px;font-family:${FONT};font-size:12px;line-height:1.6;color:${MUTED}">${text}</td></tr>
  </table>`;
}

/**
 * Το πιο σημαντικό κομμάτι αυτού του αρχείου: όταν υπάρχει ανακατεύθυνση
 * (`resolveRecipient` επέστρεψε `redirected: true`), αυτό το banner είναι το
 * ΜΟΝΟ πράγμα που λέει στον δοκιμαστή ότι το μήνυμα δεν πήγε στον πραγματικό
 * παραλήπτη. Πρέπει να είναι το πρώτο πράγμα που βλέπει κανείς.
 */
function noticeBanner(notice: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px">
    <tr><td style="background:${WARN_BG};border:1px solid ${WARN_BORDER};border-radius:8px;padding:14px 16px;font-family:${FONT};font-size:13px;line-height:1.6;font-weight:600;color:${WARN_TEXT}">${notice}</td></tr>
  </table>`;
}

function partiesLine(organizationName: string, counterpartyName: string): string {
  return `<strong style="color:${BLUE_DARK}">${organizationName}</strong> και <strong style="color:${BLUE_DARK}">${counterpartyName}</strong>`;
}

function shell(opts: { preheader: string; heading: string; bodyInner: string; notice: string | null }): string {
  return `<!doctype html>
<html lang="el"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"></head>
<body style="margin:0;padding:0;background:${BG}">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${opts.preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:100%;background:#ffffff;border:1px solid ${BORDER};border-radius:12px;overflow:hidden">
        <!-- header -->
        <tr><td style="background:${BLUE};padding:22px 28px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="font-family:${FONT};font-size:17px;font-weight:700;color:#ffffff;letter-spacing:.2px">🛡️ GDPR Compliance OS</td>
            <td align="right" style="font-family:${FONT};font-size:12px;color:#cfe4f7">DG Smart</td>
          </tr></table>
        </td></tr>
        <tr><td style="height:3px;background:${RED};line-height:3px;font-size:0">&nbsp;</td></tr>
        <!-- body -->
        <tr><td style="padding:28px 28px 8px">
          ${opts.notice ? noticeBanner(opts.notice) : ""}
          <h1 style="margin:0 0 14px;font-family:${FONT};font-size:20px;line-height:1.3;font-weight:700;color:${INK}">${opts.heading}</h1>
          <div style="font-family:${FONT};font-size:15px;line-height:1.65;color:${INK}">${opts.bodyInner}</div>
        </td></tr>
        <!-- footer -->
        <tr><td style="padding:20px 28px 24px">
          <div style="border-top:1px solid ${BORDER};padding-top:16px;font-family:${FONT};font-size:11px;line-height:1.6;color:${MUTED}">
            © DG Smart · GDPR Compliance OS — Πλατφόρμα συμμόρφωσης GDPR (ΕΕ) 2016/679.<br>
            Αυτό είναι αυτοματοποιημένο μήνυμα· μην απαντάτε σε αυτό.
          </div>
        </td></tr>
      </table>
      <div style="font-family:${FONT};font-size:11px;color:${MUTED};padding:14px 0 0">Με την επιφύλαξη παντός δικαιώματος.</div>
    </td></tr>
  </table>
</body></html>`;
}

export interface SignatureEmailParties {
  /** Τίτλος του εγγράφου προς υπογραφή (π.χ. τίτλος του DpaContract). */
  documentTitle: string;
  /** Ονοματεπώνυμο του παραλήπτη — προσωπική προσφώνηση. */
  recipientName: string;
  /** Η δική μας εταιρία, όπως εμφανίζεται στο έγγραφο. */
  organizationName: string;
  /** Η αντισυμβαλλόμενη εταιρία — ώστε ο παραλήπτης να θυμηθεί τη συνεργασία. */
  counterpartyName: string;
  /** Μη-null όταν η αποστολή ανακατευθύνθηκε από την `resolveRecipient`. */
  notice: string | null;
}

/** Πρώτη αποστολή αιτήματος υπογραφής. */
export function signatureRequestEmail(
  p: SignatureEmailParties & { signUrl: string; expiresAt: Date }
): { subject: string; html: string } {
  const expiry = p.expiresAt.toLocaleDateString("el-GR");
  const subject = `Προς υπογραφή: ${p.documentTitle} — ${p.counterpartyName}`;
  const html = shell({
    notice: p.notice,
    preheader: `Το έγγραφο «${p.documentTitle}» χρειάζεται την υπογραφή σας.`,
    heading: "Έγγραφο προς υπογραφή",
    bodyInner: `
      <p style="margin:0 0 12px">Γεια σας ${p.recipientName},</p>
      <p style="margin:0 0 12px">Σας αποστέλλουμε προς υπογραφή το έγγραφο <strong style="color:${BLUE_DARK}">«${p.documentTitle}»</strong>, μεταξύ ${partiesLine(p.organizationName, p.counterpartyName)}.</p>
      <p style="margin:0 0 4px">Ανοίξτε τον παρακάτω σύνδεσμο για να δείτε το πλήρες κείμενο και να προχωρήσετε σε ηλεκτρονική υπογραφή ή ανέβασμα υπογεγραμμένου αντιγράφου:</p>
      ${button(p.signUrl, "Προβολή & υπογραφή εγγράφου")}
      <p style="margin:0 0 12px;font-size:13px;color:${MUTED}">Αν το κουμπί δεν λειτουργεί, αντιγράψτε αυτόν τον σύνδεσμο στον browser σας:<br>
        <a href="${p.signUrl}" style="color:${BLUE};word-break:break-all">${p.signUrl}</a></p>
      ${note(`Ο σύνδεσμος είναι προσωπικός και λήγει στις <strong>${expiry}</strong>. Μετά τη λήξη θα χρειαστεί νέα αποστολή.`)}`,
  });
  return { subject, html };
}

/** Υπενθύμιση όταν το αίτημα μένει ανοιχτό — έως 3 φορές. */
export function signatureReminderEmail(
  p: SignatureEmailParties & { signUrl: string; expiresAt: Date; attemptNumber: number }
): { subject: string; html: string } {
  const expiry = p.expiresAt.toLocaleDateString("el-GR");
  const subject = `Υπενθύμιση υπογραφής (${p.attemptNumber}/3): ${p.documentTitle} — ${p.counterpartyName}`;
  const html = shell({
    notice: p.notice,
    preheader: `Υπενθύμιση: το έγγραφο «${p.documentTitle}» εξακολουθεί να εκκρεμεί προς υπογραφή.`,
    heading: "Υπενθύμιση — εκκρεμεί η υπογραφή σας",
    bodyInner: `
      <p style="margin:0 0 12px">Γεια σας ${p.recipientName},</p>
      <p style="margin:0 0 12px">Το έγγραφο <strong style="color:${BLUE_DARK}">«${p.documentTitle}»</strong>, μεταξύ ${partiesLine(p.organizationName, p.counterpartyName)}, εξακολουθεί να εκκρεμεί προς υπογραφή σας.</p>
      <p style="margin:0 0 4px">Αυτή είναι η υπενθύμιση <strong>${p.attemptNumber} από 3</strong>. Παρακαλούμε ολοκληρώστε την υπογραφή από τον παρακάτω σύνδεσμο:</p>
      ${button(p.signUrl, "Προβολή & υπογραφή εγγράφου")}
      <p style="margin:0 0 12px;font-size:13px;color:${MUTED}">Αν το κουμπί δεν λειτουργεί, αντιγράψτε αυτόν τον σύνδεσμο στον browser σας:<br>
        <a href="${p.signUrl}" style="color:${BLUE};word-break:break-all">${p.signUrl}</a></p>
      ${note(`Ο σύνδεσμος λήγει στις <strong>${expiry}</strong>. Αν δεν λάβουμε απάντηση, δεν θα σταλούν άλλες αυτόματες υπενθυμίσεις μετά την τρίτη.`)}`,
  });
  return { subject, html };
}

/** Επιβεβαίωση προς τον υπογράψαντα, μετά την υπογραφή. */
export function signatureConfirmedEmail(
  p: SignatureEmailParties & { signedAt: Date }
): { subject: string; html: string } {
  const date = p.signedAt.toLocaleString("el-GR");
  const subject = `Η υπογραφή καταχωρίστηκε — ${p.documentTitle}`;
  const html = shell({
    notice: p.notice,
    preheader: `Η υπογραφή σας για «${p.documentTitle}» καταχωρίστηκε με επιτυχία.`,
    heading: "Η υπογραφή σας καταχωρίστηκε ✔",
    bodyInner: `
      <p style="margin:0 0 12px">Γεια σας ${p.recipientName},</p>
      <p style="margin:0 0 12px">Σας ευχαριστούμε. Η υπογραφή σας για το έγγραφο <strong style="color:${BLUE_DARK}">«${p.documentTitle}»</strong>, μεταξύ ${partiesLine(p.organizationName, p.counterpartyName)}, καταχωρίστηκε με επιτυχία.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px">
        <tr><td style="background:#f0f9f0;border:1px solid #c7e6c7;border-radius:8px;padding:14px 16px;font-family:${FONT};font-size:14px;color:#11600f">
          <strong>Ημερομηνία &amp; ώρα υπογραφής:</strong> ${date}
        </td></tr>
      </table>
      ${note("Καταγράφηκαν με ασφάλεια η ημερομηνία, η ώρα, η IP και η δηλωθείσα ιδιότητα του υπογράφοντα, ως αρχείο ελέγχου της απλής ηλεκτρονικής υπογραφής.")}`,
  });
  return { subject, html };
}
