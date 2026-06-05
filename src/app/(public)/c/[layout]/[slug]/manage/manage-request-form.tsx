"use client";
import { useState } from "react";

export function ManageRequestForm({ slug }: { slug: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch(`/api/public/consent/manage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, email }),
      });
      setSent(true);
    } finally { setBusy(false); }
  }

  if (sent) return <p className="text-sm text-green-600">Αν υπάρχει εγγραφή με αυτό το email, σας στείλαμε σύνδεσμο διαχείρισης.</p>;

  return (
    <form onSubmit={submit} className="space-y-3">
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full border rounded px-3 py-2 text-sm" />
      <button type="submit" disabled={busy} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">Αποστολή συνδέσμου</button>
    </form>
  );
}
