"use client";

import { useState } from "react";

interface FieldDef { key: string; label: string; inputType: string; required: boolean }
interface PurposeDef { id: string; label: string; description: string; required: boolean }

const HTML_TYPE: Record<string, string> = { TEXT: "text", EMAIL: "email", PHONE: "tel", DATE: "date", NUMBER: "number" };

export function ConsentForm({ slug, fields, purposes }: { slug: string; fields: FieldDef[]; purposes: PurposeDef[] }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // The email/phone needed for the double opt-in are taken from configured
  // fields when the project has them — otherwise we render dedicated inputs.
  // This avoids asking for email/phone twice.
  const emailField = fields.find((f) => f.inputType === "EMAIL");
  const phoneField = fields.find((f) => f.inputType === "PHONE");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const subjectEmail = emailField ? (values[emailField.key] ?? "") : email;
      const subjectPhone = (phoneField ? values[phoneField.key] : phone) || undefined;
      const res = await fetch(`/api/public/consent/${slug}/submit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectEmail, subjectPhone, values, purposeConsents: consents, locale: "el" }),
      });
      if (!res.ok) { setError((await res.json()).error ?? "Σφάλμα"); return; }
      setDone(true);
    } finally { setBusy(false); }
  }

  if (done) return <div className="text-center py-8"><p className="text-green-600 font-medium">Ευχαριστούμε!</p><p className="text-sm text-gray-500 mt-2">Σας στείλαμε email επιβεβαίωσης. Πατήστε τον σύνδεσμο για να ολοκληρωθεί η συναίνεση.</p></div>;

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Dedicated email/phone inputs only when the project doesn't configure them as fields */}
      {!emailField && (
        <div>
          <label className="block text-sm font-medium mb-1">Email *</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
        </div>
      )}
      {!phoneField && (
        <div>
          <label className="block text-sm font-medium mb-1">Τηλέφωνο</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
        </div>
      )}
      {fields.map((f) => {
        const required = f.required || f.inputType === "EMAIL";
        return (
          <div key={f.key}>
            <label className="block text-sm font-medium mb-1">{f.label}{required ? " *" : ""}</label>
            {f.inputType === "TEXTAREA" ? (
              <textarea required={required} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
            ) : (
              <input type={HTML_TYPE[f.inputType] ?? "text"} required={required} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
            )}
          </div>
        );
      })}
      <div className="space-y-2 border-t pt-4">
        <p className="text-sm font-medium">Σκοποί επεξεργασίας</p>
        {purposes.map((p) => (
          <label key={p.id} className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={consents[p.id] ?? false} onChange={(e) => setConsents({ ...consents, [p.id]: e.target.checked })} />
            <span><strong>{p.label}{p.required ? " *" : ""}</strong><br /><span className="text-gray-500">{p.description}</span></span>
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">Υποβολή συναίνεσης</button>
    </form>
  );
}
