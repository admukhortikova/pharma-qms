import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PharmaQMS — Система управления отклонениями",
  description: "GMP-совместимая система регистрации и расследования отклонений с AI-поддержкой",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
