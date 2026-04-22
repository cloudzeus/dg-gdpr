"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { MdSearch, MdBusiness, MdClose } from "react-icons/md";

interface Company {
  id: string;
  name: string;
  vatNumber: string | null;
  legalName: string | null;
}

export function ClientPicker({ companies }: { companies: Company[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [vatInput, setVatInput] = useState("");
  const [vatLoading, setVatLoading] = useState(false);
  const [vatError, setVatError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = companies.filter((c) => {
    const q = query.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.vatNumber ?? "").includes(q) ||
      (c.legalName ?? "").toLowerCase().includes(q)
    );
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function pick(c: Company) {
    setSelected(c.name);
    setQuery(c.name);
    setVatInput(c.vatNumber ?? "");
    setOpen(false);
  }

  function clear() {
    setSelected("");
    setQuery("");
    setVatInput("");
    setVatError(null);
  }

  async function lookupVat() {
    const afm = vatInput.trim();
    if (!/^\d{9}$/.test(afm)) { setVatError("Εισάγετε 9-ψήφιο ΑΦΜ"); return; }
    setVatLoading(true); setVatError(null);
    try {
      const res = await fetch("/api/admin/vat-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ afm }),
      });
      const data = await res.json();
      if (!res.ok) { setVatError(data.error ?? "Σφάλμα"); return; }
      const name = data.name || data.legalName || "";
      setSelected(name);
      setQuery(name);
    } catch (e: any) {
      setVatError(e.message);
    } finally {
      setVatLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {/* Search dropdown */}
      <div ref={containerRef} className="relative">
        <label className="text-sm font-medium">Όνομα Πελάτη *</label>
        <div className="relative mt-1.5">
          <MdSearch
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "rgb(var(--muted-foreground))" }}
          />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(""); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Αναζήτηση από υπάρχοντες πελάτες..."
            required
            className="w-full h-9 rounded-md border border-border bg-background pl-8 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {query && (
            <button
              type="button"
              onClick={clear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
              style={{ color: "rgb(var(--muted-foreground))" }}
            >
              <MdClose size={15} />
            </button>
          )}
        </div>

        {/* Hidden input carries the actual value */}
        <input type="hidden" name="clientName" value={selected || query} />

        {/* Dropdown */}
        {open && (
          <div
            className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-lg overflow-hidden"
            style={{ maxHeight: 240 }}
          >
            <div className="overflow-y-auto" style={{ maxHeight: 240 }}>
              {filtered.length === 0 ? (
                <p className="px-3 py-2.5 text-xs text-muted-foreground">
                  Δεν βρέθηκαν αποτελέσματα — χρησιμοποιήστε το ΑΦΜ παρακάτω
                </p>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => pick(c)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors"
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(var(--secondary))")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <MdBusiness size={15} style={{ color: "rgb(var(--muted-foreground))", flexShrink: 0 }} />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{c.name}</p>
                      {c.vatNumber && (
                        <p className="text-[11px] text-muted-foreground">ΑΦΜ: {c.vatNumber}</p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* AFM fallback */}
      <div
        className="flex items-center gap-2 rounded-sm px-3 py-2"
        style={{ background: "rgba(0,120,212,0.05)", border: "1px solid rgba(0,120,212,0.18)" }}
      >
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">ή αναζήτηση ΑΦΜ:</span>
        <input
          value={vatInput}
          onChange={(e) => { setVatInput(e.target.value.replace(/\D/g, "").slice(0, 9)); setVatError(null); }}
          placeholder="9 ψηφία"
          maxLength={9}
          className="w-28 rounded border border-border bg-background px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/40"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); lookupVat(); } }}
        />
        <button
          type="button"
          onClick={lookupVat}
          disabled={vatLoading || vatInput.length !== 9}
          className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium disabled:opacity-40"
          style={{ background: "rgba(0,120,212,0.12)", color: "#0078d4", border: "1px solid rgba(0,120,212,0.25)" }}
        >
          {vatLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <MdSearch size={13} />}
          ΓΓΔΕ
        </button>
        {vatError && <p className="text-[11px] text-destructive">{vatError}</p>}
      </div>
    </div>
  );
}
