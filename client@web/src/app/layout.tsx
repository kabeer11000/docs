import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree, Geist_Mono } from "next/font/google";
import "@/styles/global.css";
import "./view-transitions.css";
import { Providers } from "./providers";

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
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

// Hosts every app screen talks to right after load (live rooms, data, auth): connect early.
const preconnectOrigins = [
  ...new Set(
    [process.env.NEXT_PUBLIC_HOCUSPOCUS_URL, process.env.NEXT_PUBLIC_CLOUDSTORE_URI, process.env.NEXT_PUBLIC_AUTH_BASE_URL].flatMap((url) => {
      try {
        return url ? [new URL(url.replace(/^ws/, "http")).origin] : [];
      } catch {
        return [];
      }
    }),
  ),
];

// Debug overlays for whoever sets the `kn.docs.debug-env` cookie. Checked in the browser so the
// layout does not read cookies on the server, which would make every page dynamic.
const debugLoader = String.raw`if(document.cookie.split("; ").some(function(c){return c.indexOf("kn.docs.debug-env=")===0})){document.write('<script crossorigin="anonymous" src="//unpkg.com/react-scan/dist/auto.global.js"><\/script><script crossorigin="anonymous" src="/__dev/stats.js"><\/script>')}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
        {preconnectOrigins.map((origin) => (
          <link key={origin} rel="preconnect" href={origin} crossOrigin="anonymous" />
        ))}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static debug loader */}
        <script dangerouslySetInnerHTML={{ __html: debugLoader }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
