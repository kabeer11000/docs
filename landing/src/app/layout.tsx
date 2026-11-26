import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-sans' });

const description =
  'A free, open-source document editor for writing together in real time. Multi-page documents, templates, comments, e-signatures and an AI assistant.';

export const metadata: Metadata = {
  title: "Docs by Kabeer's Network: write together, beautifully simple",
  description,
  openGraph: {
    title: "Docs by Kabeer's Network",
    description,
    type: 'website',
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f7f5' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1917' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
