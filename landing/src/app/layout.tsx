import './globals.css';
import type { Metadata } from 'next';
import { Literata, Schibsted_Grotesk } from 'next/font/google';

const serif = Literata({ subsets: ['latin'], display: 'swap', variable: '--font-serif' });
const sans = Schibsted_Grotesk({ subsets: ['latin'], display: 'swap', adjustFontFallback: false, variable: '--font-sans' });

const description =
  'Docs is a free, open-source document editor that runs in your browser. Write together in real time, with comments, pages, templates, e-signatures and an AI assistant.';

export const metadata: Metadata = {
  title: 'Docs: a free place to write, together',
  description,
  openGraph: { title: "Docs by Kabeer's Network", description, type: 'website' },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ECEEF1' },
    { media: '(prefers-color-scheme: dark)', color: '#141619' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <head>
        {/* Marks JS as available so the typed sentence can stay hidden until the cursor types it. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
