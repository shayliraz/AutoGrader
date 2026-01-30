"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface QuestionInput {
  question_text: string;
  max_points: number;
  rubric: string;
}

export default function NewExamPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [questions, setQuestions] = useState<QuestionInput[]>([
    { question_text: "", max_points: 20, rubric: "" },
  ]);
  const [saving, setSaving] = useState(false);

  function addQuestion() {
    setQuestions([
      ...questions,
      { question_text: "", max_points: 20, rubric: "" },
    ]);
  }

  function removeQuestion(index: number) {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  }

  function updateQuestion(index: number, field: keyof QuestionInput, value: string | number) {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, subject, questions }),
      });

      if (!res.ok) throw new Error("Failed to create exam");
      const data = await res.json();
      router.push(`/exams/${data.id}`);
    } catch {
      alert("שגיאה ביצירת המבחן");
    } finally {
      setSaving(false);
    }
  }

  const totalPoints = questions.reduce((sum, q) => sum + q.max_points, 0);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">יצירת מבחן חדש</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-xl font-semibold">פרטי המבחן</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                שם המבחן
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='לדוגמה: מבחן בספרות - סמסטר א׳'
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                מקצוע
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="לדוגמה: ספרות"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              שאלות ({questions.length}) — סה״כ {totalPoints} נקודות
            </h2>
            <button
              type="button"
              onClick={addQuestion}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              הוסף שאלה +
            </button>
          </div>

          {questions.map((q, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">שאלה {i + 1}</h3>
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(i)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    הסר שאלה
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  נוסח השאלה
                </label>
                <textarea
                  value={q.question_text}
                  onChange={(e) =>
                    updateQuestion(i, "question_text", e.target.value)
                  }
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ניקוד מקסימלי
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={q.max_points}
                  onChange={(e) =>
                    updateQuestion(i, "max_points", parseInt(e.target.value) || 0)
                  }
                  className="w-32 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  מחוון (Rubric) — מה נחשב תשובה טובה?
                </label>
                <textarea
                  value={q.rubric}
                  onChange={(e) =>
                    updateQuestion(i, "rubric", e.target.value)
                  }
                  rows={4}
                  placeholder="פרט את הקריטריונים לציון: מה חייב להופיע בתשובה, חלוקת ניקוד לפי רכיבים, דוגמה לתשובה מצוינת..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 text-white py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
        >
          {saving ? "שומר..." : "צור מבחן"}
        </button>
      </form>
    </div>
  );
}
