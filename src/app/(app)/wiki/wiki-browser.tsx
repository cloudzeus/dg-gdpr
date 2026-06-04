"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, BookOpen, ChevronRight, FileText } from "lucide-react";

export interface WikiNavItem {
  slug: string;
  title: string;
  category: string;
  categoryOrder: number;
  order: number;
  excerpt: string | null;
}

interface WikiBrowserProps {
  articles: WikiNavItem[];
  activeSlug: string | null;
  articleTitle?: string;
  articleHtml?: string;
  updatedAt?: string;
}

function groupByCategory(articles: WikiNavItem[]) {
  const map = new Map<string, WikiNavItem[]>();
  for (const a of articles) {
    if (!map.has(a.category)) map.set(a.category, []);
    map.get(a.category)!.push(a);
  }
  return Array.from(map.entries()); // already sorted by query order
}

export function WikiBrowser({ articles, activeSlug, articleTitle, articleHtml, updatedAt }: WikiBrowserProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return articles;
    const q = query.toLowerCase();
    return articles.filter((a) => a.title.toLowerCase().includes(q) || (a.excerpt ?? "").toLowerCase().includes(q) || a.category.toLowerCase().includes(q));
  }, [articles, query]);

  const groups = groupByCategory(filtered);

  return (
    <div className="mx-auto flex max-w-6xl gap-6">
      {/* Nav */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-0 space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Αναζήτηση στον οδηγό…"
              className="h-9 w-full rounded-md border border-neutral-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#0078d4]"
            />
          </div>
          <nav className="space-y-4 text-sm">
            {groups.map(([category, items]) => (
              <div key={category}>
                <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">{category}</p>
                <ul className="space-y-0.5">
                  {items.map((a) => (
                    <li key={a.slug}>
                      <Link
                        href={`/wiki/${a.slug}`}
                        className={`block rounded-md px-2 py-1.5 ${a.slug === activeSlug ? "bg-blue-50 font-medium text-[#0078d4]" : "text-neutral-600 hover:bg-neutral-100"}`}
                      >
                        {a.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {groups.length === 0 && <p className="px-2 text-neutral-400">Κανένα αποτέλεσμα.</p>}
          </nav>
        </div>
      </aside>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {articleHtml ? (
          <article className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
            <h1 className="mb-1 text-2xl font-semibold text-neutral-900">{articleTitle}</h1>
            {updatedAt && <p className="mb-6 text-xs text-neutral-400">Τελευταία ενημέρωση: {updatedAt}</p>}
            <div
              className="wiki-content max-w-none text-[15px] leading-7 text-neutral-700 [&_a]:text-[#0078d4] [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-neutral-200 [&_blockquote]:pl-4 [&_blockquote]:text-neutral-500 [&_code]:rounded [&_code]:bg-neutral-100 [&_code]:px-1 [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-neutral-900 [&_h3]:mb-1 [&_h3]:mt-5 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-neutral-800 [&_img]:my-4 [&_img]:rounded-md [&_img]:border [&_img]:border-neutral-200 [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_strong]:text-neutral-900 [&_table]:my-4 [&_table]:w-full [&_td]:border [&_td]:border-neutral-200 [&_td]:p-2 [&_th]:border [&_th]:border-neutral-200 [&_th]:bg-neutral-50 [&_th]:p-2 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6"
              dangerouslySetInnerHTML={{ __html: articleHtml }}
            />
          </article>
        ) : (
          <div>
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-[#0078d4]"><BookOpen className="h-6 w-6" /></div>
              <div>
                <h1 className="text-2xl font-semibold text-neutral-900">Οδηγός Χρήσης</h1>
                <p className="text-sm text-neutral-500">Πλήρης τεκμηρίωση της εφαρμογής GDPR Compliance OS στα Ελληνικά.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {groups.map(([category, items]) => (
                <div key={category} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
                  <p className="mb-2 text-sm font-semibold text-neutral-800">{category}</p>
                  <ul className="space-y-1">
                    {items.map((a) => (
                      <li key={a.slug}>
                        <Link href={`/wiki/${a.slug}`} className="group flex items-center gap-1.5 text-sm text-neutral-600 hover:text-[#0078d4]">
                          <FileText className="h-3.5 w-3.5 text-neutral-300 group-hover:text-[#0078d4]" />
                          {a.title}
                          <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-0 group-hover:opacity-100" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {groups.length === 0 && <p className="text-sm text-neutral-400">Δεν υπάρχουν άρθρα ακόμη.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
