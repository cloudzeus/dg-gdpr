function shell(title: string, bodyInner: string): string {
  return `<!doctype html>
<html><body style="font-family:Segoe UI,Arial,sans-serif;background:#f3f2f1;padding:24px;color:#201f1e">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #edebe9;border-radius:6px;overflow:hidden">
    <div style="background:#0078d4;color:#fff;padding:16px 20px;font-weight:600">GDPR Compliance OS</div>
    <div style="padding:20px">${bodyInner}</div>
    <div style="padding:10px 20px;border-top:1px solid #edebe9;color:#605e5c;font-size:11px">© DG Smart · GDPR Compliance OS</div>
  </div>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:20px 0"><a href="${href}" style="background:#0078d4;color:#fff;text-decoration:none;padding:10px 18px;border-radius:4px;display:inline-block">${label}</a></p>`;
}

export function consentVerifyEmail(p: { projectName: string; confirmUrl: string }) {
  const subject = `Επιβεβαίωση συναίνεσης — ${p.projectName}`;
  const html = shell(subject, `
    <p>Λάβαμε αίτημα καταχώρισης της συναίνεσής σας για <strong>${p.projectName}</strong>.</p>
    <p>Για να ολοκληρωθεί, επιβεβαιώστε πατώντας το παρακάτω κουμπί:</p>
    ${button(p.confirmUrl, "Επιβεβαίωση συναίνεσης")}
    <p style="color:#605e5c;font-size:12px">Αν δεν ζητήσατε εσείς αυτό, αγνοήστε το μήνυμα.</p>`);
  return { subject, html };
}

export function consentConfirmedEmail(p: { projectName: string; confirmedAt: Date }) {
  const date = p.confirmedAt.toLocaleString("el-GR");
  const subject = `Η συναίνεσή σας καταχωρίστηκε — ${p.projectName}`;
  const html = shell(subject, `
    <p>Η συναίνεσή σας για <strong>${p.projectName}</strong> καταχωρίστηκε στις ${date}.</p>
    <p style="color:#605e5c;font-size:12px">Μπορείτε ανά πάσα στιγμή να ανακαλέσετε τη συναίνεση ή να ζητήσετε αντίγραφο των δεδομένων σας από το κέντρο προτιμήσεων.</p>`);
  return { subject, html };
}

export function preferenceAccessEmail(p: { projectName: string; manageUrl: string }) {
  const subject = `Διαχείριση δεδομένων — ${p.projectName}`;
  const html = shell(subject, `
    <p>Ζητήσατε πρόσβαση στη διαχείριση των δεδομένων σας για <strong>${p.projectName}</strong>.</p>
    ${button(p.manageUrl, "Διαχείριση δεδομένων μου")}
    <p style="color:#605e5c;font-size:12px">Ο σύνδεσμος επιτρέπει ανάκληση συναίνεσης ή λήψη αντιγράφου των δεδομένων σας.</p>`);
  return { subject, html };
}
