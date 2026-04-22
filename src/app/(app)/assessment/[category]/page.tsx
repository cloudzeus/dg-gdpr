import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { getAllAssessmentAnswers } from "@/actions/assessment";
import {
  ASSESSMENT_CATEGORIES,
  calculateCategoryScore,
  getComplianceLevel,
  type AnswerValue,
} from "@/lib/assessment-questions";
import { AssessmentForm } from "@/components/modules/assessment-form";
import { Progress } from "@/components/ui/progress";
import { ArticleBadges } from "@/components/shared/article-badges";
import { MdArrowBack } from "react-icons/md";
import Link from "next/link";

export default async function AssessmentCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const session = await auth();

  const cat = ASSESSMENT_CATEGORIES.find((c) => c.id === category);
  if (!cat) notFound();

  const allAnswers = await getAllAssessmentAnswers();
  const saved = allAnswers[category] ?? { answers: {}, situations: {} };
  const savedAnswers = saved.answers;
  const savedSituations = saved.situations;

  const { percentage } = calculateCategoryScore(cat.questions, savedAnswers);
  const answered = Object.values(savedAnswers).filter((v) => v !== null).length;
  const level = answered > 0 ? getComplianceLevel(percentage) : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        userName={session?.user?.name}
        userRole={(session?.user as any)?.role}
        pageTitle={cat.title}
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Back + header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <Link
                href="/assessment"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors"
              >
                <MdArrowBack size={16} /> Πίσω στην Αξιολόγηση
              </Link>
              <h2 className="text-xl font-bold">{cat.title}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{cat.description}</p>
              <ArticleBadges articles={cat.articles} />
            </div>
            {level && (
              <div className={`shrink-0 rounded-xl border-2 px-5 py-3 text-center ${level.bg} ${level.border}`}>
                <p className="text-3xl font-black">{percentage}%</p>
                <p className={`text-xs font-semibold mt-0.5 ${level.color}`}>
                  {level.icon} {level.label}
                </p>
              </div>
            )}
          </div>

          {answered > 0 && <Progress value={percentage} />}

          {/* Instructions */}
          <div className="rounded-lg bg-secondary/50 border border-border p-4 text-sm space-y-1">
            <p className="font-medium">Οδηγίες:</p>
            <ul className="space-y-1 text-muted-foreground text-xs">
              <li>• <strong>Ναι</strong> = Έχει εφαρμοστεί πλήρως και τεκμηριωμένα</li>
              <li>• <strong>Μερικώς</strong> = Εφαρμόζεται εν μέρει ή δεν είναι τεκμηριωμένο</li>
              <li>• <strong>Όχι</strong> = Δεν εφαρμόζεται / δεν υπάρχει</li>
            </ul>
          </div>

          {/* Form */}
          <AssessmentForm
            categoryId={cat.id}
            questions={cat.questions}
            savedAnswers={savedAnswers}
            savedSituations={savedSituations}
          />
        </div>
      </main>
    </div>
  );
}
