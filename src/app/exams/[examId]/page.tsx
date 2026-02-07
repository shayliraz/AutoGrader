import { getDb, Exam, Question, Submission } from "@/lib/db";
import { notFound } from "next/navigation";
import UploadForm from "./upload-form";

export const dynamic = "force-dynamic";

export default async function ExamPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const db = getDb();

  const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(examId) as Exam | undefined;
  if (!exam) notFound();

  const questions = db
    .prepare("SELECT * FROM questions WHERE exam_id = ? ORDER BY question_number")
    .all(examId) as Question[];

  const submissions = db
    .prepare("SELECT * FROM submissions WHERE exam_id = ? ORDER BY created_at DESC")
    .all(examId) as Submission[];

  const totalPoints = questions.reduce((sum, q) => sum + q.max_points, 0);

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{exam.name}</h1>
            <p className="text-gray-500 mt-1">
              {exam.subject} — {questions.length} שאלות — {totalPoints} נקודות
            </p>
          </div>
          {submissions.some((s) => s.status === "graded") && (
            <a
              href={`/exams/${examId}/results`}
              className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition"
            >
              צפה בתוצאות
            </a>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">שאלות ומחוון</h2>
        <div className="space-y-4">
          {questions.map((q) => (
            <div key={q.id} className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <h3 className="font-medium">
                  שאלה {q.question_number}: {q.question_text}
                </h3>
                <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded mr-2 whitespace-nowrap">
                  {q.max_points} נק׳
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-2 whitespace-pre-wrap">
                {q.rubric}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">העלאת מבחנים סרוקים</h2>
        <UploadForm examId={examId} />
      </div>

      {submissions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">
            הגשות ({submissions.length})
          </h2>
          {submissions.some((s) => s.status === "pending") && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-sm">
              <p className="font-medium text-blue-800 mb-1">יש הגשות בהמתנה לבדיקה</p>
              <p className="text-blue-700">
                בקש מ-Claude Code: &ldquo;בדוק את המבחנים הממתינים של {exam.name}&rdquo;
              </p>
            </div>
          )}
          <div className="space-y-2">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between border border-gray-100 rounded-lg p-4"
              >
                <div>
                  <span className="font-medium">{sub.student_name}</span>
                  <span className="text-sm text-gray-400 mr-3">
                    {new Date(sub.created_at).toLocaleDateString("he-IL")}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm px-2 py-1 rounded ${
                      sub.status === "graded"
                        ? "bg-green-100 text-green-700"
                        : sub.status === "grading"
                          ? "bg-yellow-100 text-yellow-700"
                          : sub.status === "error"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {sub.status === "graded"
                      ? "נבדק"
                      : sub.status === "grading"
                        ? "בבדיקה..."
                        : sub.status === "error"
                          ? "שגיאה"
                          : "ממתין"}
                  </span>
                  {sub.status === "graded" && (
                    <a
                      href={`/exams/${examId}/results?student=${sub.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      צפה בציון →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
