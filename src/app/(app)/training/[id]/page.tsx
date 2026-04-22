import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { TrainingQuiz } from "@/components/modules/training-quiz";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock, Award, RotateCcw, BookOpen, FileText, Video, Music, Image as ImgIcon, Link as LinkIcon, File } from "lucide-react";
import Link from "next/link";
import { formatDateTime, scoreToGrade } from "@/lib/utils";

export default async function TrainingModulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const [mod, myResults] = await Promise.all([
    prisma.trainingModule.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { order: "asc" } },
        sections: {
          orderBy: { order: "asc" },
          include: { materials: { orderBy: { order: "asc" } } },
        },
      },
    }),
    prisma.trainingResult.findMany({
      where: { userId: session!.user!.id!, moduleId: id },
      orderBy: { completedAt: "desc" },
    }),
  ]);

  if (!mod) notFound();

  const lastResult = myResults[0] ?? null;
  const grade = lastResult ? scoreToGrade(lastResult.score) : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        userName={session?.user?.name}
        userRole={(session?.user as any)?.role}
        pageTitle={mod.title}
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">

          <Link
            href="/training"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Πίσω στην Εκπαίδευση
          </Link>

          {/* Module header */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">{mod.title}</h2>
            {mod.description && <p className="text-muted-foreground">{mod.description}</p>}
            <div className="flex gap-3 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {mod.durationMin} λεπτά</span>
              <span className="flex items-center gap-1"><Award className="h-3.5 w-3.5" /> Βάσιμη βαθμολογία: {mod.passingScore}%</span>
              <span>{mod.questions.length} ερωτήσεις</span>
            </div>
          </div>

          {/* Last result */}
          {lastResult && (
            <Card className={`border-2 ${lastResult.passed ? "border-green-300 dark:border-green-700" : "border-red-300 dark:border-red-700"}`}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">
                    {lastResult.passed ? "✅ Επιτυχής Αξιολόγηση" : "❌ Αποτυχία — Απαιτείται Επανεκπαίδευση"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDateTime(lastResult.completedAt)} · Απόπειρα #{myResults.length}
                  </p>
                </div>
                <div className={`text-3xl font-black ${grade?.color}`}>
                  {Math.round(lastResult.score)}%
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sections + materials */}
          {mod.sections.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Εκπαιδευτικό Υλικό</h3>
              {mod.sections.map((s, i) => (
                <Card key={s.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground text-sm">#{i + 1}</span> {s.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {s.body && <p className="text-sm text-foreground whitespace-pre-wrap">{s.body}</p>}
                    {s.materials.length > 0 && (
                      <div className="space-y-1.5">
                        {s.materials.map((m) => {
                          const Icon =
                            m.type === "PDF" || m.type === "ARTICLE" ? FileText :
                            m.type === "VIDEO" ? Video :
                            m.type === "AUDIO" ? Music :
                            m.type === "IMAGE" ? ImgIcon :
                            m.type === "LINK" ? LinkIcon : File;
                          const External = m.url ? "a" : "div";
                          return (
                            <External
                              key={m.id}
                              {...(m.url ? { href: m.url, target: "_blank", rel: "noreferrer" } : {})}
                              className="flex items-center gap-2 rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm hover:bg-secondary transition-colors"
                            >
                              <Icon className="h-4 w-4 text-primary shrink-0" />
                              <Badge variant="secondary" className="text-[10px]">{m.type}</Badge>
                              <span className="flex-1 truncate">{m.title}</span>
                              {m.url && <span className="text-xs text-primary">Άνοιγμα →</span>}
                            </External>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* History */}
          {myResults.length > 1 && (
            <details className="group">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" />
                Ιστορικό αποπειρών ({myResults.length})
              </summary>
              <div className="mt-2 space-y-1.5 pl-5">
                {myResults.map((r, i) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">#{myResults.length - i} — {formatDateTime(r.completedAt)}</span>
                    <span className={`font-semibold ${r.passed ? "text-green-600" : "text-red-600"}`}>
                      {Math.round(r.score)}% {r.passed ? "✓" : "✗"}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Quiz */}
          <TrainingQuiz
            moduleId={mod.id}
            passingScore={mod.passingScore}
            questions={mod.questions.map((q) => ({
              id: q.id,
              question: q.question,
              options: q.options as string[],
              correctAnswer: q.correctAnswer,
              explanation: q.explanation ?? "",
              weight: q.weight,
            }))}
            userId={session!.user!.id!}
          />
        </div>
      </main>
    </div>
  );
}
