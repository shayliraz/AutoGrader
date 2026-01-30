"use client";

interface ExportData {
  student_name: string;
  total_score: number;
  total_max: number;
  percentage: number;
  questions: { number: number; score: number | null; max: number; feedback: string | null }[];
}

export default function ExportButton({
  data,
  examName,
}: {
  data: ExportData[];
  examName: string;
}) {
  function exportCSV() {
    if (data.length === 0) return;

    const questionNumbers = data[0].questions.map((q) => q.number);
    const headers = [
      "שם התלמיד",
      ...questionNumbers.map((n) => `שאלה ${n}`),
      "סה״כ",
      "ציון",
    ];

    const rows = data.map((d) => [
      d.student_name,
      ...d.questions.map((q) => `${q.score || 0}/${q.max}`),
      `${d.total_score}/${d.total_max}`,
      d.percentage.toString(),
    ]);

    // BOM for Hebrew in Excel
    const bom = "\uFEFF";
    const csv = bom + [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${examName}-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${examName}-results.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={exportCSV}
        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition text-sm"
      >
        ייצוא CSV
      </button>
      <button
        onClick={exportJSON}
        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition text-sm"
      >
        ייצוא JSON
      </button>
    </div>
  );
}
