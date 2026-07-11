import type { Metadata } from "next";
import "./globals.css";
import { auth } from "@/auth";
import SideNav from "@/components/SideNav";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "CaseReady AI - Surgical Readiness Command Centre",
  description: "Burjeel Hospital Surgical Readiness Command Centre",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen relative flex">
        {session ? (
          <>
            <SideNav user={session.user} />
            <div className="flex-1 flex flex-col ml-[232px] w-[calc(100%-232px)]">
              <Header user={session.user} />
              <div className="flex-grow min-h-screen bg-background">
                {children}
              </div>
            </div>
          </>
        ) : (
          <main className="w-full min-h-screen bg-[#F7F5F1]">
            {children}
          </main>
        )}
      </body>
    </html>
  );
}
