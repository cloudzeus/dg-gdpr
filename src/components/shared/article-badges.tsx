"use client";

import { useState } from "react";
import { findArticle } from "@/lib/gdpr-articles";
import { ArticlePanel } from "./article-panel";
import type { GdprArticle } from "@/lib/gdpr-articles";

interface ArticleBadgesProps {
  articles: string[];
}

export function ArticleBadges({ articles }: ArticleBadgesProps) {
  const [open, setOpen] = useState<GdprArticle | null>(null);

  const handleClick = (ref: string) => {
    const article = findArticle(ref);
    if (article) setOpen(article);
  };

  return (
    <>
      <div className="flex gap-1.5 mt-2 flex-wrap">
        {articles.map((a) => {
          const hasData = !!findArticle(a);
          return (
            <button
              key={a}
              onClick={() => handleClick(a)}
              disabled={!hasData}
              className="inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-semibold transition-all"
              style={{
                background: "rgba(0,120,212,0.08)",
                border: "1px solid rgba(0,120,212,0.25)",
                color: "rgb(0,120,212)",
                cursor: hasData ? "pointer" : "default",
              }}
              onMouseEnter={(e) => {
                if (hasData) {
                  e.currentTarget.style.background = "rgba(0,120,212,0.16)";
                  e.currentTarget.style.borderColor = "rgba(0,120,212,0.5)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(0,120,212,0.08)";
                e.currentTarget.style.borderColor = "rgba(0,120,212,0.25)";
              }}
            >
              Άρθρο {a}
            </button>
          );
        })}
      </div>

      <ArticlePanel article={open} onClose={() => setOpen(null)} />
    </>
  );
}
