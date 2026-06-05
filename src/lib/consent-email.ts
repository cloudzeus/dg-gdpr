/* ──────────────────────────────────────────────────────────────────────────
   Transactional email templates — DG design system (Fluent 2 + DG brand).
   Email-client-safe: table layout, inline styles, bulletproof (VML) button.
   Tokens: Sisyphus Blue #0078D4 · DG Red #E31E2A · warm neutrals.
   ──────────────────────────────────────────────────────────────────────── */

const BLUE = "#0078D4";
const BLUE_DARK = "#106EBE";
const RED = "#E31E2A";
const INK = "#201F1E";
const MUTED = "#605E5C";
const BORDER = "#EDEBE9";
const BG = "#FAF9F8";
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

function shell(opts: { preheader: string; heading: string; bodyInner: string }): string {
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

export function consentVerifyEmail(p: { projectName: string; confirmUrl: string }) {
  const subject = `Επιβεβαίωση συναίνεσης — ${p.projectName}`;
  const html = shell({
    preheader: `Επιβεβαιώστε τη συναίνεσή σας για «${p.projectName}».`,
    heading: "Επιβεβαιώστε τη συναίνεσή σας",
    bodyInner: `
      <p style="margin:0 0 12px">Λάβαμε αίτημα καταχώρισης της συναίνεσής σας για <strong style="color:${BLUE_DARK}">${p.projectName}</strong>.</p>
      <p style="margin:0 0 4px">Για να ολοκληρωθεί η διαδικασία, πατήστε το κουμπί:</p>
      ${button(p.confirmUrl, "Επιβεβαίωση συναίνεσης")}
      <p style="margin:0 0 12px;font-size:13px;color:${MUTED}">Αν το κουμπί δεν λειτουργεί, αντιγράψτε αυτόν τον σύνδεσμο στον browser σας:<br>
        <a href="${p.confirmUrl}" style="color:${BLUE};word-break:break-all">${p.confirmUrl}</a></p>
      ${note("Αν δεν ζητήσατε εσείς αυτό, αγνοήστε αυτό το μήνυμα — δεν θα καταχωρηθεί καμία συναίνεση.")}`,
  });
  return { subject, html };
}

export function consentConfirmedEmail(p: { projectName: string; confirmedAt: Date }) {
  const date = p.confirmedAt.toLocaleString("el-GR");
  const subject = `Η συναίνεσή σας καταχωρίστηκε — ${p.projectName}`;
  const html = shell({
    preheader: `Η συναίνεσή σας για «${p.projectName}» καταχωρίστηκε με επιτυχία.`,
    heading: "Η συναίνεσή σας καταχωρίστηκε ✔",
    bodyInner: `
      <p style="margin:0 0 12px">Σας ευχαριστούμε. Η συναίνεσή σας για <strong style="color:${BLUE_DARK}">${p.projectName}</strong> καταχωρίστηκε με επιτυχία.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px">
        <tr><td style="background:#f0f9f0;border:1px solid #c7e6c7;border-radius:8px;padding:14px 16px;font-family:${FONT};font-size:14px;color:#11600f">
          <strong>Ημερομηνία &amp; ώρα:</strong> ${date}
        </td></tr>
      </table>
      ${note("Καταγράφηκαν με ασφάλεια η ημερομηνία, η ώρα και η IP σας ως απόδειξη συναίνεσης. Μπορείτε ανά πάσα στιγμή να ανακαλέσετε τη συναίνεση ή να ζητήσετε αντίγραφο των δεδομένων σας από το κέντρο προτιμήσεων.")}`,
  });
  return { subject, html };
}

export function preferenceAccessEmail(p: { projectName: string; manageUrl: string }) {
  const subject = `Διαχείριση δεδομένων — ${p.projectName}`;
  const html = shell({
    preheader: `Σύνδεσμος για τη διαχείριση των δεδομένων σας στο «${p.projectName}».`,
    heading: "Διαχείριση των δεδομένων σας",
    bodyInner: `
      <p style="margin:0 0 12px">Ζητήσατε πρόσβαση στη διαχείριση των δεδομένων σας για <strong style="color:${BLUE_DARK}">${p.projectName}</strong>.</p>
      <p style="margin:0 0 4px">Από τον παρακάτω σύνδεσμο μπορείτε να ανακαλέσετε τη συναίνεση ή να λάβετε αντίγραφο των δεδομένων σας:</p>
      ${button(p.manageUrl, "Διαχείριση δεδομένων μου")}
      ${note("Ο σύνδεσμος είναι προσωπικός. Μην τον προωθείτε σε τρίτους.")}`,
  });
  return { subject, html };
}
