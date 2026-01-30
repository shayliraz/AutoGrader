import { getDb, Exam, Question, Submission, Grade } from "@/lib/db";
import { notFound } from "next/navigation";
import GradeAdjuster from "./grade-adjuster";
import ExportButton from "./export-button";

export const dynamic = "force-dynamic";

interface SubmissionWithGrades extends Submission {
  grades: (Grade & { question_number: number; question_text: string })[];
  totalScore: number;
  totalMaxPoints: number;
}

export default async function ResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ student?: string }>;
}) {
  const { examId } = await params;
  const { student } = await searchParams;
  const db = getDb();

  const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(examId) as Exam | undefined;
  if (!exam) notFound();

  const questions = db
    .prepare("SELECT * FROM questions WHERE exam_id = ? ORDER BY question_number")
    .all(examId) as Question[];

  let submissionsQuery = "SELECT * FROM submissions WHERE exam_id = ? AND status = 'graded'";
  const queryParams: string[] = [examId];
  if (student) {
    submissionsQuery += " AND id = ?";
    queryParams.push(student);
  }
  submissionsQuery += " ORDER BY student_name";

  const submissions = db.prepare(submissionsQuery).all(...queryParams) as Submission[];

  const submissionsWithGrades: SubmissionWithGrades[] = submissions.map((sub) => {
    const grades = db
      .prepare(
        `SELECT g.*, q.question_number, q.question_text
         FROM grades g
         JOIN questions q ON g.question_id = q.id
         WHERE g.submission_id = ?
         ORDER BY q.question_number`
      )
      .all(sub.id) as (Grade & { question_number: number; question_text: string })[];

    const totalScore = grades.reduce((sum, g) => sum + (g.score || 0), 0);
    const totalMaxPoints = grades.reduce((sum, g) => sum + g.max_points, 0);

    return { ...sub, grades, totalScore, totalMaxPoints };
  });

  // Prepare export data
  const exportData = submissionsWithGrades.map((sub) => ({
    student_name: sub.student_name,
    total_score: sub.totalScore,
    total_max: sub.totalMaxPoints,
    percentage: Math.round((sub.totalScore / sub.totalMaxPoints) * 100),
    questions: sub.grades.map((g) => ({
      number: g.question_number,
      score: g.score,
      max: g.max_points,
      feedback: g.feedback,
    })),
  }));

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">תוצאות — {exam.name}</h1>
            <p className="text-gray-500 mt-1">
              {submissionsWithGrades.length} הגשות נבדקו
            </p>
          </div>
          <div className="flex gap-3">
            <a
              href={`/exams/${examId}`}
              className="text-blue-600 hover:text-blue-800"
            >
              ← חזרה למבחן
            </a>
            <ExportButton data={exportData} examName={exam.name} />
          </div>
        </div>
      </div>

      {/* Summary table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 overflow-x-auto">
        <h2 className="text-xl font-semibold mb-4">סיכום ציונים</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-right py-2 px-3">תלמיד/ה</th>
              {questions.map((q) => (
                <th key={q.id} className="text-center py-2 px-3">
                  ש׳{q.question_number} ({q.max_points})
                </th>
              ))}
              <th className="text-center py-2 px-3 font-bold">סה״כ</th>
              <th className="text-center py-2 px-3 font-bold">ציון</th>
            </tr>
          </thead>
          <tbody>
            {submissionsWithGrades.map((sub) => (
              <tr key={sub.id} className="border-b border-gray-50">
                <td className="py-2 px-3 font-medium">{sub.student_name}</td>
                {sub.grades.map((g) => (
                  <td key={g.id} className="text-center py-2 px-3">
                    <span
                      className={
                        g.manually_adjusted
                          ? "text-orange-600 font-medium"
                          : ""
                      }
                    >
                      {g.score}
                    </span>
                  </td>
                ))}
                <td className="text-center py-2 px-3 font-bold">
                  {sub.totalScore}/{sub.totalMaxPoints}
                </td>
                <td className="text-center py-2 px-3 font-bold">
                  {Math.round((sub.totalScore / sub.totalMaxPoints) * 100)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detailed view per student */}
      {submissionsWithGrades.map((sub) => (
        <div
          key={sub.id}
          className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{sub.student_name}</h2>
            <span className="text-2xl font-bold text-blue-600">
              {Math.round((sub.totalScore / sub.totalMaxPoints) * 100)} ציון
            </span>
          </div>

          {sub.grades.map((g) => (
            <div
              key={g.id}
              className="border border-gray-100 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  שאלה {g.question_number}: {g.question_text}
                </h3>
                <GradeAdjuster
                  gradeId={g.id}
                  currentScore={g.score || 0}
                  maxPoints={g.max_points}
                  manuallyAdjusted={!!g.manually_adjusted}
                />
              </div>

              {g.transcribed_text && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">טקסט שזוהה:</p>
                  <p className="text-sm whitespace-pre-wrap">
                    {g.transcribed_text}
                  </p>
                </div>
              )}

              {g.feedback && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-400 mb-1">משוב:</p>
                  <p className="text-sm whitespace-pre-wrap">{g.feedback}</p>
                </div>
              )}

              {g.ai_reasoning && (
                <details className="text-sm">
                  <summary className="text-gray-400 cursor-pointer hover:text-gray-600">
                    הצג נימוקי AI
                  </summary>
                  <div className="bg-yellow-50 rounded-lg p-3 mt-2" dir="ltr">
                    <p className="whitespace-pre-wrap">{g.ai_reasoning}</p>
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
