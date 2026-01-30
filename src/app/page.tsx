import { getDb, Exam } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const db = getDb();
  const exams = db.prepare("SELECT * FROM exams ORDER BY created_at DESC").all() as Exam[];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">המבחנים שלי</h1>

      {exams.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500 text-lg mb-4">עדיין אין מבחנים</p>
          <a
            href="/exams/new"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            צור מבחן חדש
          </a>
        </div>
      ) : (
        <div className="grid gap-4">
          {exams.map((exam) => {
            const questionCount = (
              db
                .prepare("SELECT COUNT(*) as count FROM questions WHERE exam_id = ?")
                .get(exam.id) as { count: number }
            ).count;
            const submissionCount = (
              db
                .prepare("SELECT COUNT(*) as count FROM submissions WHERE exam_id = ?")
                .get(exam.id) as { count: number }
            ).count;
            const gradedCount = (
              db
                .prepare(
                  "SELECT COUNT(*) as count FROM submissions WHERE exam_id = ? AND status = 'graded'"
                )
                .get(exam.id) as { count: number }
            ).count;

            return (
              <a
                key={exam.id}
                href={`/exams/${exam.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{exam.name}</h2>
                    <p className="text-gray-500 mt-1">{exam.subject}</p>
                  </div>
                  <div className="text-left text-sm text-gray-500">
                    <p>{questionCount} שאלות</p>
                    <p>
                      {gradedCount}/{submissionCount} נבדקו
                    </p>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
