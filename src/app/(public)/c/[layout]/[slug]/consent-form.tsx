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
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-[#8a8886] bg-white px-3 py-2 text-sm text-[#201F1E] outline-none transition-shadow placeholder:text-[#a19f9d] focus:border-[#0078D4] focus:ring-2 focus:ring-[#0078D4]/25" />
        </div>
      )}
      {!phoneField && (
        <div>
          <label className="block text-sm font-medium mb-1">Τηλέφωνο</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-md border border-[#8a8886] bg-white px-3 py-2 text-sm text-[#201F1E] outline-none transition-shadow placeholder:text-[#a19f9d] focus:border-[#0078D4] focus:ring-2 focus:ring-[#0078D4]/25" />
        </div>
      )}
      {fields.map((f) => {
        const required = f.required || f.inputType === "EMAIL";
        return (
          <div key={f.key}>
            <label className="block text-sm font-medium mb-1">{f.label}{required ? " *" : ""}</label>
            {f.inputType === "TEXTAREA" ? (
              <textarea required={required} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} className="w-full rounded-md border border-[#8a8886] bg-white px-3 py-2 text-sm text-[#201F1E] outline-none transition-shadow placeholder:text-[#a19f9d] focus:border-[#0078D4] focus:ring-2 focus:ring-[#0078D4]/25" />
            ) : (
              <input type={HTML_TYPE[f.inputType] ?? "text"} required={required} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} className="w-full rounded-md border border-[#8a8886] bg-white px-3 py-2 text-sm text-[#201F1E] outline-none transition-shadow placeholder:text-[#a19f9d] focus:border-[#0078D4] focus:ring-2 focus:ring-[#0078D4]/25" />
            )}
          </div>
        );
      })}
      <div className="space-y-2 border-t pt-4" style={{ borderColor: "#EDEBE9" }}>
        <p className="text-sm font-semibold" style={{ color: "#201F1E" }}>Σκοποί επεξεργασίας</p>
        {purposes.map((p) => (
          <label
            key={p.id}
            className="flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm transition-colors hover:bg-[#faf9f8]"
            style={{ borderColor: "#EDEBE9" }}
          >
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#0078D4]" checked={consents[p.id] ?? false} onChange={(e) => setConsents({ ...consents, [p.id]: e.target.checked })} />
            <span>
              <strong style={{ color: "#201F1E" }}>{p.label}{p.required ? " *" : ""}</strong>
              {p.description && <><br /><span style={{ color: "#605E5C" }}>{p.description}</span></>}
            </span>
          </label>
        ))}
      </div>
      {error && <p className="rounded-md border border-[#f3d6d8] bg-[#fdf3f4] px-3 py-2 text-sm text-[#a4262c]">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: "var(--accent, #0078D4)" }}
      >
        {busy ? "Υποβολή…" : "Υποβολή συναίνεσης"}
      </button>
    </form>
  );
}
