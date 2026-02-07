"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadForm({ examId }: { examId: string }) {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!files?.length) return;
    setUploading(true);

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

      router.refresh();
      setStudentName("");
      setFiles(null);
    } catch (err) {
      alert(`שגיאה: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={uploading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {uploading ? "מעלה..." : "העלה מבחן"}
        </button>
        <p className="text-sm text-gray-500">
          לאחר ההעלאה, בקש מ-Claude Code לבדוק את המבחנים
        </p>
      </div>
    </form>
  );
}
