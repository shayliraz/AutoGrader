"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GradeAdjuster({
  gradeId,
  currentScore,
  maxPoints,
  manuallyAdjusted,
}: {
  gradeId: string;
  currentScore: number;
  maxPoints: number;
  manuallyAdjusted: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [score, setScore] = useState(currentScore);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/grade", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade_id: gradeId, score }),
      });
      setEditing(false);
      router.refresh();
    } catch {
      alert("שגיאה בשמירת הציון");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={maxPoints}
          value={score}
          onChange={(e) => setScore(parseInt(e.target.value) || 0)}
          className="w-16 border border-gray-300 rounded px-2 py-1 text-center"
        />
        <span className="text-sm text-gray-400">/ {maxPoints}</span>
        <button
          onClick={save}
          disabled={saving}
          className="text-sm bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50"
        >
          שמור
        </button>
        <button
          onClick={() => {
            setScore(currentScore);
            setEditing(false);
          }}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ביטול
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={`text-lg font-bold ${
          manuallyAdjusted ? "text-orange-600" : "text-blue-600"
        }`}
      >
        {currentScore}/{maxPoints}
      </span>
      {manuallyAdjusted && (
        <span className="text-xs text-orange-500">✎ עודכן ידנית</span>
      )}
      <button
        onClick={() => setEditing(true)}
        className="text-sm text-gray-400 hover:text-blue-600"
      >
        ערוך
      </button>
    </div>
  );
}
