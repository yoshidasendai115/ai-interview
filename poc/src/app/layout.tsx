import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Avatar PoC - HeyGen vs D-ID',
  description: 'AI面接練習プラットフォーム用アバター技術検証',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
