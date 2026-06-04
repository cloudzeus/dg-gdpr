import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { listPublishedArticles, getArticleBySlug } from "@/actions/wiki";
import { Topbar } from "@/components/layout/topbar";
import { AppFooter } from "@/components/layout/app-footer";
import { formatDateTime } from "@/lib/utils";
import { WikiBrowser } from "../wiki-browser";

export default async function WikiArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  const [articles, article] = await Promise.all([listPublishedArticles(), getArticleBySlug(slug)]);
  if (!article) notFound();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        userName={session?.user?.name}
        userRole={(session?.user as { role?: string } | undefined)?.role}
        pageTitle="Οδηγός Χρήσης"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <WikiBrowser
          articles={articles}
          activeSlug={slug}
          articleTitle={article.title}
          articleHtml={article.content}
          updatedAt={formatDateTime(article.updatedAt)}
        />
        <div className="mx-auto max-w-6xl"><AppFooter /></div>
      </main>
    </div>
  );
}
