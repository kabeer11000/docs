import type { Metadata } from "next";
import "@/styles/global.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Lexa - Legal Document Management",
  description:
    "Professional legal document management and collaboration platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
