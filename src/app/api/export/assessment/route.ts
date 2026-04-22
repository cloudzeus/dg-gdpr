import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllAssessmentAnswers } from "@/actions/assessment";
import {
  ASSESSMENT_CATEGORIES,
  calculateCategoryScore,
  getComplianceLevel,
  getOverallScore,
} from "@/lib/assessment-questions";
import { buildAssessmentWord } from "@/lib/export-word";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await getAllAssessmentAnswers();
  const savedAnswers = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v.answers]));
  const overallScore = getOverallScore(savedAnswers);

  const categories = ASSESSMENT_CATEGORIES.map((cat) => {
    const entry = raw[cat.id] ?? { answers: {}, situations: {} };
    const answers = entry.answers;
    const situations = entry.situations;
    const { percentage } = calculateCategoryScore(cat.questions, answers);
    const level = getComplianceLevel(percentage);

    const gaps = cat.questions
      .filter((q) => answers[q.id] === "no" || answers[q.id] === "partial")
      .map((q) => ({
        question: q.text,
        priority: q.priority === "critical" ? "Κρίσιμο" : q.priority === "high" ? "Υψηλό" : "Μέτριο",
        action:
          answers[q.id] === "no"
            ? q.actionIfNo ?? "Άμεση ενέργεια"
            : q.actionIfPartial ?? "Βελτίωση απαιτείται",
        situation: situations[q.id] ?? "",
      }));

    return { title: cat.title, percentage, level: level.label, gaps };
  });

  const buf = await buildAssessmentWord(categories, overallScore);

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="gdpr-assessment-${new Date().toISOString().slice(0, 10)}.docx"`,
    },
  });
}
