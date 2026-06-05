"use client";

import { useState, useTransition } from "react";
import { captureConsent } from "@/actions/capture";
import { findContactFields, type CaptureTemplateProps } from "../types";
import { SignaturePad } from "./signature-pad";
import styles from "./wizard-signature.module.css";

const HTML_TYPE: Record<string, string> = { TEXT: "text", EMAIL: "email", PHONE: "tel", DATE: "date", NUMBER: "number" };

const I = {
  user: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  shield: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  pen: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15.5 3.5c.83-.83 2.17-.83 3 0s.83 2.17 0 3l-11 11-4 1 1-4 11-11z" /></svg>,
  doc: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12h6M9 16h6M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  check: <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>,
  checkSm: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>,
  back: <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>,
};

export default function WizardSignature({ project, fields, purposes, logoUrl }: CaptureTemplateProps) {
  const { emailField, phoneField } = findContactFields(fields);
  const [step, setStep] = useState(0); // 0 details, 1 consent, 2 signature, 3 done
  const [values, setValues] = useState<Record<string, string>>({});
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [email, setEmail] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [doneRef, setDoneRef] = useState<string | null>(null);
  const [confirmedAt, setConfirmedAt] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const subjectEmail = emailField ? values[emailField.key] ?? "" : email;
  const consentedLabels = purposes.filter((p) => consents[p.id]).map((p) => p.label);

  function submit() {
    setError(null);
    const subjectPhone = phoneField ? values[phoneField.key] : undefined;
    startTransition(async () => {
      try {
        const res = await captureConsent({
          slug: project.slug, values, purposeConsents: consents,
          subjectEmail, subjectPhone, signatureDataUrl: signature ?? undefined,
        });
        setDoneRef(res.recordId);
        setConfirmedAt(new Date().toLocaleString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }));
        setStep(3);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Σφάλμα");
      }
    });
  }

  const stepClass = (i: number) => `${styles.step} ${step === i ? styles.stepActive : step > i ? styles.stepDone : ""}`;

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <a href="/" className={styles.back}>{I.back} Κεντρικό</a>
          <div className={styles.headerDivider} />
          {logoUrl ? <img src={logoUrl} alt="" className={styles.logo} /> : <span className={styles.headerTitle}>{project.name}</span>}
        </div>
        <div className={styles.steps}>
          <span className={stepClass(0)}>{step > 0 ? I.checkSm : "1"}</span>
          <span className={`${styles.line} ${step > 0 ? styles.lineDone : ""}`} />
          <span className={stepClass(1)}>{step > 1 ? I.checkSm : "2"}</span>
          <span className={`${styles.line} ${step > 1 ? styles.lineDone : ""}`} />
          <span className={stepClass(2)}>{step > 2 ? I.checkSm : "3"}</span>
        </div>
      </header>

      <main className={styles.content}>
        {step === 0 && (
          <>
            <h1 className={styles.h1}>Στοιχεία</h1>
            <p className={styles.sub}>{project.description || "Συμπληρώστε τα στοιχεία σας"}</p>
            <div className={styles.card}>
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionIcon}>{I.user}</div>
                  <div>
                    <div className={styles.sectionTitle}>Προσωπικά Στοιχεία</div>
                    <div className={styles.sectionSub}>Βασικές πληροφορίες</div>
                  </div>
                </div>
                {!emailField && (
                  <div className={styles.row}>
                    <div className={styles.group}>
                      <label className={styles.label}>Email <span className={styles.req}>*</span></label>
                      <input className={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                  </div>
                )}
                {fields.map((f) => (
                  <div key={f.key} className={styles.row}>
                    <div className={styles.group}>
                      <label className={styles.label}>{f.label}{f.required || f.inputType === "EMAIL" ? <span className={styles.req}> *</span> : null}</label>
                      <input className={styles.input} type={HTML_TYPE[f.inputType] ?? "text"} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className={styles.h1}>Σκοποί Επεξεργασίας</h1>
            <p className={styles.sub}>Επιλέξτε τους σκοπούς για τους οποίους συναινείτε</p>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderIcon}>{I.shield}</div>
                <div>
                  <div className={styles.sectionTitle}>Συναινέσεις</div>
                  <div className={styles.sectionSub}>Επιλέξτε τους σκοπούς</div>
                </div>
              </div>
              <div className={styles.cardBody}>
                {purposes.map((p) => (
                  <label key={p.id} className={styles.consentItem}>
                    <span className={styles.checkbox}>
                      <input type="checkbox" checked={consents[p.id] ?? false} onChange={(e) => setConsents({ ...consents, [p.id]: e.target.checked })} />
                      <span className={styles.checkmark}>✓</span>
                    </span>
                    <span className={styles.consentText}>
                      <h3>{p.label}{p.required ? " *" : ""}</h3>
                      {p.description && <p>{p.description}</p>}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className={styles.h1}>Υπογραφή</h1>
            <p className={styles.sub}>Υπογράψτε για επιβεβαίωση της συναίνεσης</p>
            <div className={styles.card}>
              <div className={styles.sigCardHeader}>
                <div className={styles.sigCardIcon}>{I.pen}</div>
                <div>
                  <div className={styles.sigCardLabel}>Ψηφιακή Υπογραφή</div>
                  <div className={styles.sectionSub}>Υπογράψτε στο πλαίσιο</div>
                </div>
              </div>
              <div className={styles.cardBody}>
                <SignaturePad onChange={setSignature} />
                <div className={styles.summary}>
                  <div className={styles.summaryHeader}>{I.doc} Σύνοψη Καταχώρησης</div>
                  <div className={styles.summaryRow}><span>Email</span><span>{subjectEmail || "—"}</span></div>
                  <div className={styles.summaryRow}><span>Συναινέσεις</span><span>{consentedLabels.join(", ") || "—"}</span></div>
                </div>
              </div>
            </div>
            {error && <p className={styles.err}>{error}</p>}
          </>
        )}

        {step === 3 && (
          <div className={styles.center}>
            <div className={styles.successBadge}>{I.checkSm}<span>Επιτυχής Καταχώρηση</span></div>
            <div className={styles.successIcon}>{I.check}</div>
            <h1 className={styles.h1}>Ευχαριστούμε</h1>
            <p className={styles.sub}>Η συναίνεση καταχωρήθηκε με επιτυχία</p>
            <div className={styles.card} style={{ textAlign: "left" }}>
              <div className={styles.cardBody}>
                <div className={styles.detailRow}><span className={styles.detailLabel}>Email</span><span className={styles.detailValue}>{subjectEmail || "—"}</span></div>
                <div className={styles.detailRow}><span className={styles.detailLabel}>Ημερομηνία</span><span className={styles.detailValue}>{confirmedAt}</span></div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Συναινέσεις</span>
                  <span className={styles.badges}>
                    {consentedLabels.length === 0 ? <span className={styles.detailValue}>—</span> :
                      consentedLabels.map((l) => <span key={l} className={styles.badge}>{I.checkSm} {l}</span>)}
                  </span>
                </div>
                <div className={styles.ref}>
                  <span className={styles.refLabel}>Αριθμός αναφοράς</span>
                  <code className={styles.refCode}>{doneRef}</code>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {step < 3 && (
        <footer className={styles.footer}>
          <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Πίσω</button>
          {step < 2 ? (
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setStep((s) => s + 1)}>Συνέχεια</button>
          ) : (
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={submit} disabled={!signature || isPending}>{isPending ? "Υποβολή…" : "Υποβολή"}</button>
          )}
        </footer>
      )}
    </div>
  );
}
