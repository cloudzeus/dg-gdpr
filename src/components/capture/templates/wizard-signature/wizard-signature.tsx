"use client";

import { useState, useTransition } from "react";
import { captureConsent } from "@/actions/capture";
import { findContactFields, type CaptureTemplateProps } from "../types";
import { SignaturePad } from "./signature-pad";
import styles from "./wizard-signature.module.css";

const HTML_TYPE: Record<string, string> = { TEXT: "text", EMAIL: "email", PHONE: "tel", DATE: "date", NUMBER: "number" };

export default function WizardSignature({ project, fields, purposes }: CaptureTemplateProps) {
  const { emailField, phoneField } = findContactFields(fields);
  const [step, setStep] = useState(0); // 0 details, 1 consent, 2 signature, 3 done
  const [values, setValues] = useState<Record<string, string>>({});
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [signature, setSignature] = useState<string | null>(null);
  const [doneRef, setDoneRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const subjectEmail = emailField ? values[emailField.key] ?? "" : "";
    const subjectPhone = phoneField ? values[phoneField.key] : undefined;
    startTransition(async () => {
      try {
        const res = await captureConsent({
          slug: project.slug, values, purposeConsents: consents,
          subjectEmail, subjectPhone, signatureDataUrl: signature ?? undefined,
        });
        setDoneRef(res.recordId);
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
        <span className={styles.headerTitle}>{project.name}</span>
        <div className={styles.steps}>
          <span className={stepClass(0)}>1</span>
          <span className={`${styles.line} ${step > 0 ? styles.lineDone : ""}`} />
          <span className={stepClass(1)}>2</span>
          <span className={`${styles.line} ${step > 1 ? styles.lineDone : ""}`} />
          <span className={stepClass(2)}>3</span>
        </div>
      </header>

      <main className={styles.content}>
        {step === 0 && (
          <>
            <h1 className={styles.h1}>Στοιχεία Πελάτη</h1>
            <p className={styles.sub}>Συμπληρώστε τα στοιχεία του πελάτη</p>
            <div className={styles.card}>
              <div className={styles.section}>
                {fields.map((f) => (
                  <div key={f.key} className={styles.row}>
                    <div className={styles.group}>
                      <label className={styles.label}>{f.label}{f.required || f.inputType === "EMAIL" ? <span className={styles.req}> *</span> : null}</label>
                      <input
                        className={styles.input}
                        type={HTML_TYPE[f.inputType] ?? "text"}
                        value={values[f.key] ?? ""}
                        onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                      />
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
            <p className={styles.sub}>Επιλέξτε τους σκοπούς για τους οποίους συναινεί ο πελάτης</p>
            <div className={styles.card}>
              <div className={styles.section}>
                {purposes.map((p) => (
                  <label key={p.id} className={styles.consentItem}>
                    <input type="checkbox" checked={consents[p.id] ?? false} onChange={(e) => setConsents({ ...consents, [p.id]: e.target.checked })} />
                    <div className={styles.consentText}>
                      <h3>{p.label}{p.required ? " *" : ""}</h3>
                      {p.description && <p>{p.description}</p>}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className={styles.h1}>Υπογραφή Πελάτη</h1>
            <p className={styles.sub}>Ο πελάτης υπογράφει για επιβεβαίωση της συναίνεσης</p>
            <div className={styles.card}>
              <div className={styles.section}>
                <SignaturePad onChange={setSignature} />
              </div>
            </div>
            {error && <p style={{ color: "#a4262c", marginTop: 12 }}>{error}</p>}
          </>
        )}

        {step === 3 && (
          <div className={styles.center}>
            <div className={styles.successIcon}>
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <h1 className={styles.h1}>Ευχαριστούμε</h1>
            <p className={styles.sub}>Η συναίνεση καταχωρήθηκε με επιτυχία</p>
            <div className={styles.ref}>
              <span style={{ color: "#6e6e73", fontSize: 12 }}>Αριθμός αναφοράς</span>
              <code className={styles.refCode}>{doneRef}</code>
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
