import { Topbar } from "@/components/layout/topbar";
import { auth } from "@/lib/auth";
import { listTrainingModules, listTrainingHistory } from "@/actions/training-admin";
import { TrainingAdmin } from "@/components/modules/training-admin";

export default async function TrainingAdminPage() {
  const session = await auth();
  const [modules, history] = await Promise.all([
    listTrainingModules(),
    listTrainingHistory(),
  ]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar userName={session?.user?.name} userRole={(session?.user as any)?.role} pageTitle="Διαχείριση Εκπαίδευσης" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <TrainingAdmin
            modules={modules.map((m) => ({
              id: m.id,
              title: m.title,
              description: m.description,
              passingScore: m.passingScore,
              durationMin: m.durationMin,
              targetRole: m.targetRole,
              isActive: m.isActive,
              sectionCount: m._count.sections,
              questionCount: m._count.questions,
              resultCount: m._count.results,
            }))}
            history={history.map((h) => ({
              id: h.id,
              userName: h.user.name ?? h.user.email ?? "—",
              userEmail: h.user.email,
              moduleTitle: h.module.title,
              passingScore: h.module.passingScore,
              score: h.score,
              passed: h.passed,
              completedAt: h.completedAt.toISOString(),
              retryCount: h.retryCount,
            }))}
          />
        </div>
      </main>
    </div>
  );
}
