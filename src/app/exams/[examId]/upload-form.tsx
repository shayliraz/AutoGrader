"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadForm({ examId }: { examId: string }) {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("anthropic_api_key") || "";
    }
    return "";
  });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!files?.length) return;
    setUploading(true);
    setProgress("מעלה קבצים...");

    // Save API key for future use
    if (typeof window !== "undefined") {
      localStorage.setItem("anthropic_api_key", apiKey);
    }

    try {
      const formData = new FormData();
      formData.append("student_name", studentName);
      formData.append("exam_id", examId);
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }

      const uploadRes = await fetch("/api/submissions", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");
      const { id: submissionId } = await uploadRes.json();

      setProgress("בודק את המבחן... (זה יכול לקחת דקה)");

      const gradeRes = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_id: submissionId, api_key: apiKey }),
      });

      if (!gradeRes.ok) {
        const err = await gradeRes.json();
        throw new Error(err.error || "Grading failed");
      }

      setProgress("הבדיקה הושלמה!");
      router.refresh();
    } catch (err) {
      alert(`שגיאה: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setUploading(false);
      setProgress("");
      setStudentName("");
      setFiles(null);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          מפתח API של Anthropic
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-ant-..."
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
          dir="ltr"
          required
        />
        <p className="text-xs text-gray-400 mt-1">
          המפתח נשמר רק בדפדפן שלך ולא נשלח לשרת
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            שם התלמיד/ה
          </label>
          <input
            type="text"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="לדוגמה: ישראל ישראלי"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            דפי מבחן סרוקים (תמונות)
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(e.target.files)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={uploading}
        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
      >
        {uploading ? progress : "העלה ובדוק"}
      </button>
    </form>
  );
}
