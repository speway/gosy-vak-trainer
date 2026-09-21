import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Экзаменариум — подготовка к ГОСам по психологии",
  description:
    "70 экзаменационных билетов, карточки, тесты, практические кейсы и тренажёр устного ответа для подготовки к ГОСам и ВАК по психологии.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
