import type { Metadata } from "next";

import { QueryProvider } from "@/lib/providers/query-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "Job Application Tracker",
  description: "Track job applications, interviews, and next steps.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
