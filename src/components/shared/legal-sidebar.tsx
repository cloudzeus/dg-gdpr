import { MdGavel, MdMenuBook, MdTipsAndUpdates, MdOpenInNew } from "react-icons/md";
import { cn } from "@/lib/utils";

interface Article {
  number: string;
  title: string;
  summary: string;
}

interface LegalSidebarProps {
  title: string;
  summary: string;
  articles: Article[];
  tips?: string[];
  className?: string;
}

export function LegalSidebar({ title, summary, articles, tips, className }: LegalSidebarProps) {
  return (
    <aside
      className={cn(
        "w-72 shrink-0 rounded-sm bg-card self-start sticky top-5 space-y-4 p-4",
        className
      )}
      style={{
        border: "1px solid rgb(var(--border))",
        boxShadow: "0 1.6px 3.6px 0 rgba(0,0,0,.08), 0 0.3px 0.9px 0 rgba(0,0,0,.06)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2" style={{ color: "rgb(0,120,212)" }}>
        <MdGavel size={18} />
        <span className="text-[13px] font-semibold">Νομικό Πλαίσιο</span>
      </div>

      <p className="text-[12px] leading-relaxed" style={{ color: "rgb(var(--muted-foreground))" }}>
        {summary}
      </p>

      {/* Articles */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <MdMenuBook size={13} style={{ color: "rgb(var(--muted-foreground))" }} />
          <span
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "rgb(var(--muted-foreground))" }}
          >
            Σχετικά Άρθρα GDPR
          </span>
        </div>
        {articles.map((a) => (
          <div
            key={a.number}
            className="rounded-sm p-3 space-y-1"
            style={{
              background: "rgba(0,120,212,0.05)",
              border: "1px solid rgba(0,120,212,0.15)",
            }}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-bold" style={{ color: "rgb(0,120,212)" }}>
                Άρθρο {a.number}
              </span>
              <span className="text-[11px]" style={{ color: "rgb(var(--muted-foreground))" }}>
                — {a.title}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: "rgb(var(--foreground))", opacity: 0.75 }}>
              {a.summary}
            </p>
          </div>
        ))}
      </div>

      {/* Tips */}
      {tips && tips.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <MdTipsAndUpdates size={13} style={{ color: "rgb(var(--muted-foreground))" }} />
            <span
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "rgb(var(--muted-foreground))" }}
            >
              Πρακτικές Συμβουλές
            </span>
          </div>
          <ul className="space-y-1.5">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px]" style={{ color: "rgb(var(--foreground))", opacity: 0.75 }}>
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: "rgb(0,120,212)" }}
                />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      <a
        href="https://gdpr-info.eu/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-[12px]"
        style={{ color: "rgb(0,120,212)" }}
      >
        <MdOpenInNew size={13} />
        Πλήρες κείμενο GDPR
      </a>
    </aside>
  );
}
