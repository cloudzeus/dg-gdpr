"use client";

import { useEffect } from "react";
import { MdClose, MdOpenInNew, MdMenuBook, MdWarning, MdCheckCircle, MdInfo } from "react-icons/md";
import type { GdprArticle } from "@/lib/gdpr-articles";

interface ArticlePanelProps {
  article: GdprArticle | null;
  onClose: () => void;
}

export function ArticlePanel({ article, onClose }: ArticlePanelProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-200 ${article ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        style={{ background: "rgba(0,0,0,0.3)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 bottom-0 z-50 flex flex-col transition-transform duration-250 ease-out`}
        style={{
          width: 420,
          background: "rgb(var(--card))",
          borderLeft: "1px solid rgb(var(--border))",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
          transform: article ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {article && (
          <>
            {/* Header */}
            <div
              className="flex items-start justify-between px-5 py-4 shrink-0"
              style={{ borderBottom: "1px solid rgb(var(--border))" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="flex items-center justify-center rounded-sm shrink-0"
                  style={{ width: 36, height: 36, background: "rgba(0,120,212,0.1)" }}
                >
                  <MdMenuBook size={18} style={{ color: "rgb(0,120,212)" }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgb(0,120,212)" }}>
                    Άρθρο {article.number} · {article.chapter}
                  </p>
                  <h2 className="text-[15px] font-semibold leading-snug" style={{ color: "rgb(var(--foreground))" }}>
                    {article.title}
                  </h2>
                </div>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 ml-2 flex items-center justify-center rounded-sm transition-colors"
                style={{ width: 28, height: 28 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.06)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <MdClose size={18} style={{ color: "rgb(var(--muted-foreground))" }} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Summary */}
              <div
                className="rounded-sm p-3 text-[13px] leading-relaxed"
                style={{ background: "rgba(0,120,212,0.05)", border: "1px solid rgba(0,120,212,0.15)", color: "rgb(var(--foreground))" }}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <MdInfo size={14} style={{ color: "rgb(0,120,212)" }} />
                  <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgb(0,120,212)" }}>Περίληψη</span>
                </div>
                {article.summary}
              </div>

              {/* Obligations */}
              {article.obligations.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <MdCheckCircle size={14} style={{ color: "#107c10" }} />
                    <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgb(var(--muted-foreground))" }}>
                      Υποχρεώσεις
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {article.obligations.map((ob, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px]" style={{ color: "rgb(var(--foreground))" }}>
                        <span
                          className="mt-1.5 shrink-0 rounded-full"
                          style={{ width: 5, height: 5, background: "rgb(0,120,212)", flexShrink: 0 }}
                        />
                        {ob}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Examples */}
              {article.examples.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <MdInfo size={14} style={{ color: "rgb(var(--muted-foreground))" }} />
                    <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgb(var(--muted-foreground))" }}>
                      Πρακτικά Παραδείγματα
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {article.examples.map((ex, i) => (
                      <li
                        key={i}
                        className="rounded-sm px-3 py-2 text-[12px] leading-relaxed"
                        style={{
                          background: "rgba(16,124,16,0.05)",
                          border: "1px solid rgba(16,124,16,0.15)",
                          color: "rgb(var(--foreground))",
                        }}
                      >
                        {ex}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Violations */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <MdWarning size={14} style={{ color: "#d83b01" }} />
                  <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgb(var(--muted-foreground))" }}>
                    Τι Αποτελεί Παραβίαση
                  </span>
                </div>
                <p
                  className="rounded-sm px-3 py-2 text-[12px] leading-relaxed"
                  style={{
                    background: "rgba(216,59,1,0.05)",
                    border: "1px solid rgba(216,59,1,0.15)",
                    color: "rgb(var(--foreground))",
                  }}
                >
                  {article.violations}
                </p>
              </div>

              {/* Penalty */}
              {article.penalty && (
                <div
                  className="rounded-sm px-3 py-2 text-[12px]"
                  style={{
                    background: "rgba(216,59,1,0.04)",
                    border: "1px solid rgba(216,59,1,0.12)",
                    color: "#d83b01",
                  }}
                >
                  <strong>Πρόστιμο:</strong> {article.penalty}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="px-5 py-3 shrink-0"
              style={{ borderTop: "1px solid rgb(var(--border))" }}
            >
              <a
                href={article.edpbLink ?? "https://gdpr-info.eu/"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[12px]"
                style={{ color: "rgb(0,120,212)" }}
              >
                <MdOpenInNew size={13} />
                Πλήρες κείμενο Άρθρου {article.number} — gdpr-info.eu
              </a>
            </div>
          </>
        )}
      </div>
    </>
  );
}
