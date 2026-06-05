"use client";

import { useState, useTransition } from "react";
import { captureConsent } from "@/actions/capture";
import { findContactFields, type CaptureTemplateProps } from "../types";
import styles from "./default.module.css";

const HTML_TYPE: Record<string, string> = { TEXT: "text", EMAIL: "email", PHONE: "tel", DATE: "date", NUMBER: "number" };

export default function DefaultCapture({ project, fields, purposes }: CaptureTemplateProps) {
  const { emailField, phoneField } = findContactFields(fields);
  const [values, setValues] = useState<Record<string, string>>({});
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [doneRef, setDoneRef] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const subjectEmail = emailField ? values[emailField.key] ?? "" : email;
    const subjectPhone = phoneField ? values[phoneField.key] : undefined;
    startTransition(async () => {
      try {
        const res = await captureConsent({ slug: project.slug, values, purposeConsents: consents, subjectEmail, subjectPhone });
        setDoneRef(res.recordId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Σφάλμα");
      }
    });
  }

  if (doneRef) {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <p className={styles.title}>Σχεδόν έτοιμα ✔</p>
          <p className={styles.desc}>Σας στείλαμε email επιβεβαίωσης. Πατήστε τον σύνδεσμο για να ολοκληρωθεί η συναίνεση.<br />Αριθμός αναφοράς: <strong>{doneRef}</strong></p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={submit}>
        <h1 className={styles.title}>{project.name}</h1>
        {project.description && <p className={styles.desc}>{project.description}</p>}

        {!emailField && (
          <div className={styles.group}>
            <label className={styles.label}>Email *</label>
            <input className={styles.input} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        )}

        {fields.map((f) => (
          <div key={f.key} className={styles.group}>
            <label className={styles.label}>{f.label}{f.required || f.inputType === "EMAIL" ? " *" : ""}</label>
            <input
              className={styles.input}
              type={HTML_TYPE[f.inputType] ?? "text"}
              required={f.required || f.inputType === "EMAIL"}
              value={values[f.key] ?? ""}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
            />
          </div>
        ))}

        <div className={styles.purposes}>
          {purposes.map((p) => (
            <label key={p.id} className={styles.purpose}>
              <input type="checkbox" checked={consents[p.id] ?? false} onChange={(e) => setConsents({ ...consents, [p.id]: e.target.checked })} />
              <span><strong>{p.label}{p.required ? " *" : ""}</strong><br /><span style={{ color: "#605e5c", fontSize: 13 }}>{p.description}</span></span>
            </label>
          ))}
        </div>

        {error && <p className={styles.err}>{error}</p>}
        <button className={styles.btn} type="submit" disabled={isPending}>{isPending ? "Υποβολή…" : "Υποβολή συναίνεσης"}</button>
      </form>
    </div>
  );
}
