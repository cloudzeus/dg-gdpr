import { auth } from "@/lib/auth";
import { listAllArticles } from "@/actions/wiki";
import { Topbar } from "@/components/layout/topbar";
import { AppFooter } from "@/components/layout/app-footer";
import { WikiAdmin } from "./wiki-admin";

export default async function WikiAdminPage() {
  const session = await auth();
  const articles = await listAllArticles();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        userName={session?.user?.name}
        userRole={(session?.user as { role?: string } | undefined)?.role}
        pageTitle="Οδηγός Χρήσης (Διαχείριση)"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="mb-1 text-2xl font-semibold text-neutral-900">Οδηγός Χρήσης — Διαχείριση</h1>
          <p className="mb-6 text-sm text-neutral-500">Δημιουργία και επεξεργασία άρθρων τεκμηρίωσης.</p>
          <WikiAdmin initialArticles={JSON.parse(JSON.stringify(articles))} />
          <AppFooter />
        </div>
      </main>
    </div>
  );
}
