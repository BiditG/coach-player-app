import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'SprintNP — Cricket Social Network',
  description: 'Share stat cards, get recognised by coaches, and track your cricket.',
};

export const viewport: Viewport = {
  themeColor: '#f5f5f7',
  colorScheme: 'light',
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-canvas text-ink antialiased">
      <body className="min-h-[100dvh] bg-canvas text-ink">{children}</body>
    </html>
  );
}
