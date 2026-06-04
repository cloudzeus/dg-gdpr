import { auth } from "@/lib/auth";
import { listPublishedArticles } from "@/actions/wiki";
import { Topbar } from "@/components/layout/topbar";
import { AppFooter } from "@/components/layout/app-footer";
import { WikiBrowser } from "./wiki-browser";

export default async function WikiHomePage() {
  const session = await auth();
  const articles = await listPublishedArticles();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        userName={session?.user?.name}
        userRole={(session?.user as { role?: string } | undefined)?.role}
        pageTitle="Οδηγός Χρήσης"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <WikiBrowser articles={articles} activeSlug={null} />
        <div className="mx-auto max-w-6xl"><AppFooter /></div>
      </main>
    </div>
  );
}
