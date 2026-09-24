import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Framewise — Video feedback, made clear',
  description: 'AI and professional video analysis.'
};

export const viewport: Viewport = {
  maximumScale: 1
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="bg-[#f5f5f7] text-[#1d1d1f]"
    >
      <body className="min-h-[100dvh] bg-[#f5f5f7]">{children}</body>
    </html>
  );
}
