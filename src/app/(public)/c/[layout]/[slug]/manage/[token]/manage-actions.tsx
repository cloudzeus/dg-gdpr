"use client";
import { useState } from "react";

export function ManageActions({ slug, token, withdrawn }: { slug: string; token: string; withdrawn: boolean }) {
  const [isWithdrawn, setIsWithdrawn] = useState(withdrawn);
  const [busy, setBusy] = useState(false);

  async function withdraw() {
    if (!confirm("Ανάκληση της συναίνεσής σας;")) return;
    setBusy(true);
    try {
      await fetch(`/api/public/consent/manage/${token}/withdraw`, { method: "POST" });
      setIsWithdrawn(true);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <a href={`/api/public/consent/manage/${token}/export`} className="block w-full text-center border border-blue-600 text-blue-600 py-2 rounded hover:bg-blue-50">Λήψη των δεδομένων μου (JSON)</a>
      {isWithdrawn ? (
        <p className="text-sm text-gray-500 text-center">Η συναίνεσή σας έχει ανακληθεί.</p>
      ) : (
        <button onClick={withdraw} disabled={busy} className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 disabled:opacity-50">Ανάκληση συναίνεσης</button>
      )}
    </div>
  );
}
