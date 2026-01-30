import { NextRequest, NextResponse } from "next/server";
import { getDb, Question, Submission } from "@/lib/db";
import { gradeSubmission } from "@/lib/grading-engine";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
  const { submission_id, api_key } = await req.json();

  if (!submission_id || !api_key) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const db = getDb();
  const submission = db
    .prepare("SELECT * FROM submissions WHERE id = ?")
    .get(submission_id) as Submission | undefined;

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const questions = db
    .prepare("SELECT * FROM questions WHERE exam_id = ? ORDER BY question_number")
    .all(submission.exam_id) as Question[];

  // Mark as grading
  db.prepare("UPDATE submissions SET status = 'grading' WHERE id = ?").run(
    submission_id
  );

  try {
    const imagePaths = JSON.parse(submission.image_paths) as string[];
    const results = await gradeSubmission(imagePaths, questions, api_key);

    const insertGrade = db.prepare(
      `INSERT OR REPLACE INTO grades (id, submission_id, question_id, score, max_points, transcribed_text, feedback, ai_reasoning)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const insertAll = db.transaction(() => {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const r = results[i];
        insertGrade.run(
          uuid(),
          submission_id,
          q.id,
          r.score,
          q.max_points,
          r.transcribed_text,
          r.feedback,
          r.ai_reasoning
        );
      }
      db.prepare("UPDATE submissions SET status = 'graded' WHERE id = ?").run(
        submission_id
      );
    });

    insertAll();

    return NextResponse.json({ success: true });
  } catch (err) {
    db.prepare("UPDATE submissions SET status = 'error' WHERE id = ?").run(
      submission_id
    );
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Grading failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const { grade_id, score } = await req.json();

  if (!grade_id || score === undefined) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const db = getDb();
  db.prepare(
    "UPDATE grades SET score = ?, manually_adjusted = 1 WHERE id = ?"
  ).run(score, grade_id);

  return NextResponse.json({ success: true });
}
