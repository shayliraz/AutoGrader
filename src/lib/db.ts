import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "autograder.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initDb(db);
  }
  return db;
}

function initDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'draft'
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      question_number INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      max_points INTEGER NOT NULL,
      rubric TEXT NOT NULL,
      UNIQUE(exam_id, question_number)
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      student_name TEXT NOT NULL,
      image_paths TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS grades (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      score INTEGER,
      max_points INTEGER NOT NULL,
      transcribed_text TEXT,
      feedback TEXT,
      ai_reasoning TEXT,
      manually_adjusted INTEGER NOT NULL DEFAULT 0,
      UNIQUE(submission_id, question_id)
    );
  `);
}

export interface Exam {
  id: string;
  name: string;
  subject: string;
  created_at: string;
  status: string;
}

export interface Question {
  id: string;
  exam_id: string;
  question_number: number;
  question_text: string;
  max_points: number;
  rubric: string;
}

export interface Submission {
  id: string;
  exam_id: string;
  student_name: string;
  image_paths: string;
  status: string;
  created_at: string;
}

export interface Grade {
  id: string;
  submission_id: string;
  question_id: string;
  score: number | null;
  max_points: number;
  transcribed_text: string | null;
  feedback: string | null;
  ai_reasoning: string | null;
  manually_adjusted: number;
}
