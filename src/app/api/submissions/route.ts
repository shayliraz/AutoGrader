import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuid } from "uuid";
import path from "path";
import fs from "fs";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const studentName = formData.get("student_name") as string;
  const examId = formData.get("exam_id") as string;
  const files = formData.getAll("files") as File[];

  if (!studentName || !examId || files.length === 0) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const submissionId = uuid();
  const uploadDir = path.join(process.cwd(), "public", "uploads", submissionId);
  fs.mkdirSync(uploadDir, { recursive: true });

  const imagePaths: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = file.name.split(".").pop() || "png";
    const fileName = `page-${i + 1}.${ext}`;
    const filePath = path.join(uploadDir, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    imagePaths.push(filePath);
  }

  const db = getDb();
  db.prepare(
    "INSERT INTO submissions (id, exam_id, student_name, image_paths) VALUES (?, ?, ?, ?)"
  ).run(submissionId, examId, studentName, JSON.stringify(imagePaths));

  return NextResponse.json({ id: submissionId });
}
