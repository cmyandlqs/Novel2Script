import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Noverl2Script",
  description: "AI assisted novel-to-screenplay YAML drafting tool.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
