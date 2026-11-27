import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Landing } from "@/components/landing/landing";
import { AUTH_COOKIES } from "@/lib/auth/cookies";

const description =
  "Docs is a free, open-source suite for documents, spreadsheets and presentations. Write together in real time, publish to the web, and automate it with an API.";

export const metadata: Metadata = {
  title: "Docs: a free place to write, together",
  description,
  openGraph: { title: "Docs by Kabeer's Network", description, type: "website" },
};

// Signed-in visitors go straight to their files (decided on the server, so no landing flash).
export default async function RootPage() {
  const jar = await cookies();
  if (jar.get(AUTH_COOKIES.REFRESH_TOKEN)?.value || jar.get(AUTH_COOKIES.ACCESS_TOKEN)?.value) redirect("/home");
  return <Landing />;
}
