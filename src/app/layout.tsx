/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from "next";
import "./globals.css";
import { auth } from "@/auth";
import { getHospitalName, getDefaultLanguage } from "@/lib/settings";
import { ensureDbReady } from "@/db/provision";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "CaseReady AI - Surgical Readiness Command Centre",
  description: "Human-supervised surgical readiness and operating-room recovery platform.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureDbReady();
  const session = await auth();
  const hospitalName = session ? await getHospitalName() : "";
  const defaultLanguage = session ? await getDefaultLanguage() : "en";

  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen">
        {session ? (
          <AppShell user={session.user} hospitalName={hospitalName} defaultLanguage={defaultLanguage}>
            {children}
          </AppShell>
        ) : (
          <main className="w-full min-h-screen bg-[#F7F5F1]">
            {children}
          </main>
        )}
      </body>
    </html>
  );
}
