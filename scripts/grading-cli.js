#!/usr/bin/env node

/**
 * CLI helper for Claude Code grading workflow
 *
 * Usage:
 *   node scripts/grading-cli.js list           - List all pending submissions
 *   node scripts/grading-cli.js show <id>      - Show submission details + image paths
 *   node scripts/grading-cli.js grade <id>     - Write grades for a submission (reads from stdin)
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'autograder.db');

function getDb() {
  if (!fs.existsSync(dbPath)) {
    console.error('Database not found. Start the webapp first to initialize it.');
    process.exit(1);
  }
  return new Database(dbPath);
}

function listPending() {
  const db = getDb();
  const submissions = db.prepare(`
    SELECT s.id, s.student_name, s.status, s.image_paths, s.created_at, e.name as exam_name
    FROM submissions s
    JOIN exams e ON s.exam_id = e.id
    WHERE s.status = 'pending'
    ORDER BY s.created_at DESC
  `).all();

  if (submissions.length === 0) {
    console.log('No pending submissions.');
    return;
  }

  console.log(`\n=== ${submissions.length} Pending Submissions ===\n`);
  for (const s of submissions) {
    const images = JSON.parse(s.image_paths);
    console.log(`ID: ${s.id}`);
    console.log(`  Student: ${s.student_name}`);
    console.log(`  Exam: ${s.exam_name}`);
    console.log(`  Images: ${images.length} file(s)`);
    console.log(`  Created: ${s.created_at}`);
    console.log('');
  }
}

function showSubmission(id) {
  const db = getDb();

  const submission = db.prepare(`
    SELECT s.*, e.name as exam_name, e.subject
    FROM submissions s
    JOIN exams e ON s.exam_id = e.id
    WHERE s.id = ?
  `).get(id);

  if (!submission) {
    console.error('Submission not found');
    process.exit(1);
  }

  const questions = db.prepare(`
    SELECT * FROM questions WHERE exam_id = ? ORDER BY question_number
  `).all(submission.exam_id);

  const images = JSON.parse(submission.image_paths);

  console.log('\n=== Submission Details ===\n');
  console.log(`Student: ${submission.student_name}`);
  console.log(`Exam: ${submission.exam_name} (${submission.subject})`);
  console.log(`Status: ${submission.status}`);
  console.log(`\n--- Image Paths (for Claude Code to read) ---`);
  for (const img of images) {
    console.log(path.join(__dirname, '..', 'public', img));
  }

  console.log(`\n--- Questions & Rubrics ---`);
  for (const q of questions) {
    console.log(`\nQuestion ${q.question_number} (${q.max_points} points):`);
    console.log(`  Text: ${q.question_text}`);
    console.log(`  Rubric: ${q.rubric}`);
  }

  console.log('\n--- To grade, provide JSON in this format ---');
  const template = questions.map(q => ({
    question_number: q.question_number,
    score: 0,
    transcribed_text: "מה שהתלמיד כתב",
    feedback: "משוב לתלמיד בעברית",
    ai_reasoning: "Reasoning for the grade in English"
  }));
  console.log(JSON.stringify(template, null, 2));
}

function writeGrades(id) {
  const db = getDb();

  const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(id);
  if (!submission) {
    console.error('Submission not found');
    process.exit(1);
  }

  const questions = db.prepare(`
    SELECT * FROM questions WHERE exam_id = ? ORDER BY question_number
  `).all(submission.exam_id);

  // Read JSON from stdin
  let input = '';
  const stdin = fs.readFileSync(0, 'utf-8');

  let grades;
  try {
    grades = JSON.parse(stdin);
  } catch (e) {
    console.error('Invalid JSON input');
    process.exit(1);
  }

  const { v4: uuid } = require('uuid');

  const insertGrade = db.prepare(`
    INSERT OR REPLACE INTO grades (id, submission_id, question_id, score, max_points, transcribed_text, feedback, ai_reasoning)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAll = db.transaction(() => {
    for (const grade of grades) {
      const question = questions.find(q => q.question_number === grade.question_number);
      if (!question) continue;

      insertGrade.run(
        uuid(),
        id,
        question.id,
        grade.score,
        question.max_points,
        grade.transcribed_text,
        grade.feedback,
        grade.ai_reasoning
      );
    }
    db.prepare("UPDATE submissions SET status = 'graded' WHERE id = ?").run(id);
  });

  insertAll();
  console.log('Grades written successfully!');
}

// Main
const [,, command, arg] = process.argv;

switch (command) {
  case 'list':
    listPending();
    break;
  case 'show':
    if (!arg) {
      console.error('Usage: node grading-cli.js show <submission_id>');
      process.exit(1);
    }
    showSubmission(arg);
    break;
  case 'grade':
    if (!arg) {
      console.error('Usage: echo \'[...]\' | node grading-cli.js grade <submission_id>');
      process.exit(1);
    }
    writeGrades(arg);
    break;
  default:
    console.log(`
AutoGrader CLI Helper

Commands:
  list              List all pending submissions
  show <id>         Show submission details, image paths, and rubrics
  grade <id>        Write grades (reads JSON from stdin)

Workflow:
  1. Run: node scripts/grading-cli.js list
  2. Run: node scripts/grading-cli.js show <id>
  3. Ask Claude Code to read the images and grade based on the rubric
  4. Claude Code runs: echo '<grades_json>' | node scripts/grading-cli.js grade <id>
`);
}
