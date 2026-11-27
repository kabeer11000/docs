import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree, Geist_Mono } from "next/font/google";
import "@/styles/global.css";
import { cookies } from 'next/headers';
import { Providers } from "./providers";
import { Fragment } from "react";

const uiFont = Figtree({ subsets: ["latin"], variable: "--font-ui" });
const displayFont = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display-face", axes: ["opsz", "wdth"] });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Kabeer's Docs - Document Management & Collaboration",
  description:
    "Document management and collaboration platform",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1014" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  return (
    <html lang="en" className={`${uiFont.variable} ${displayFont.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Docs" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/svg+xml" href="/logo.svg" />
        {await cookieStore.get('kn.docs.debug-env') && <Fragment>
          <script
            crossOrigin="anonymous"
            src="//unpkg.com/react-scan/dist/auto.global.js"
          />
          <script
            crossOrigin="anonymous"
            src="/__dev/stats.js"
          />
        </Fragment>}
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
