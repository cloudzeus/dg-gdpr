import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { auth } from "@/lib/auth";
import { getTrainingModule } from "@/actions/training-admin";
import { TrainingModuleEditor } from "@/components/modules/training-module-editor";

export default async function TrainingModuleAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const mod = await getTrainingModule(id);
  if (!mod) notFound();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar userName={session?.user?.name} userRole={(session?.user as any)?.role} pageTitle={`Ενότητα: ${mod.title}`} />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          <TrainingModuleEditor
            moduleData={{
              id: mod.id,
              title: mod.title,
              description: mod.description,
              passingScore: mod.passingScore,
              durationMin: mod.durationMin,
              targetRole: mod.targetRole,
              isActive: mod.isActive,
            }}
            sections={mod.sections.map((s) => ({
              id: s.id,
              title: s.title,
              body: s.body,
              order: s.order,
              materials: s.materials.map((m) => ({
                id: m.id,
                type: m.type,
                title: m.title,
                url: m.url,
                content: m.content,
              })),
            }))}
            questions={mod.questions.map((q) => ({
              id: q.id,
              question: q.question,
              options: JSON.parse((q.options as string) ?? "[]"),
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              weight: q.weight,
            }))}
          />
        </div>
      </main>
    </div>
  );
}
