import type { Metadata } from "next";
import "@/styles/global.css";
import { cookies } from 'next/headers';
import { Providers } from "./providers";
import { Fragment } from "react";
import { PWASupport } from "@/components/PWASupport";

export const metadata: Metadata = {
  title: "Kabeer's Docs - Document Management & Collaboration",
  description:
    "Document management and collaboration platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Docs" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
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
        <PWASupport/>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
