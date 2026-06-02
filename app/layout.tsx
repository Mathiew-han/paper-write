import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "医学影像论文写作助手",
  description: "Excel/CSV 数据集驱动的医学影像论文草稿生成工作台"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
