import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, subject, questions } = body;

  if (!name || !subject || !questions?.length) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const db = getDb();
  const examId = uuid();

  db.prepare("INSERT INTO exams (id, name, subject) VALUES (?, ?, ?)").run(
    examId,
    name,
    subject
  );

  const insertQ = db.prepare(
    "INSERT INTO questions (id, exam_id, question_number, question_text, max_points, rubric) VALUES (?, ?, ?, ?, ?, ?)"
  );

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    insertQ.run(uuid(), examId, i + 1, q.question_text, q.max_points, q.rubric);
  }

  return NextResponse.json({ id: examId });
}
