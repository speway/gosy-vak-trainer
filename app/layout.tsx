import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "Экзаменариум — подготовка к ГОСам по психологии",
  description:
    "70 экзаменационных билетов, 39 экспертных заданий, карточки, кейсы и тренажёр устного ответа на основе учебников и первоисточников по психологии.",
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
    <html lang="ru" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={`${GeistSans.className} antialiased`}>{children}</body>
    </html>
  );
}
