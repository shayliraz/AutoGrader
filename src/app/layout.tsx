import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoGrader - בודק מבחנים אוטומטי",
  description: "מערכת לבדיקת מבחנים בכתב יד בעברית באמצעות בינה מלאכותית",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <nav className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <a href="/" className="text-2xl font-bold text-blue-600">
              AutoGrader
            </a>
            <div className="flex gap-4">
              <a
                href="/"
                className="text-gray-600 hover:text-blue-600 transition"
              >
                מבחנים
              </a>
              <a
                href="/exams/new"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                מבחן חדש +
              </a>
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
