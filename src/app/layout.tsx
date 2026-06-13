/**
 * 根布局 - Providers & 全局结构
 */
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "锐鹰数视 - AI 智能数据可视化平台",
    template: "%s | 锐鹰数视",
  },
  description: "AI 智能数据可视化平台，支持团队协作与权限管理",
  keywords: ["dashboard", "analytics", "saas", "data visualization"],
  icons: { icon: "/logo.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-gray-50 font-sans antialiased dark:bg-gray-950">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
