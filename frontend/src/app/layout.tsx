import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { MessageSquare, FileText } from "lucide-react";
import "./globals.css";
import { ReactQueryProvider } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Optimus Console",
  description: "Internal operations AI assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ReactQueryProvider>
          <div className="flex min-h-screen bg-slate-950 text-slate-50">
            <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-slate-800 bg-slate-950/95 px-4 py-6 shadow-xl md:flex">
              <div className="mb-6 flex items-center gap-2 px-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/40">
                  <span className="text-sm font-semibold">OA</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold tracking-tight">
                    Optimus Console
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Internal operations assistant
                  </span>
                </div>
              </div>

              <nav className="space-y-1 px-1 text-sm">
                <Link
                  href="/chat"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-200 transition-colors hover:bg-slate-800 hover:text-slate-50"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Chat</span>
                </Link>
                <Link
                  href="/documents"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-200 transition-colors hover:bg-slate-800 hover:text-slate-50"
                >
                  <FileText className="h-4 w-4" />
                  <span>Documents</span>
                </Link>
              </nav>

              <div className="mt-auto flex flex-col gap-1 border-t border-slate-800 pt-4 text-[11px] text-slate-500">
                <span className="font-medium text-slate-300">
                  Optimus Agent
                </span>
                <span>Secure internal tooling for operations workflows.</span>
              </div>
            </aside>

            <div className="flex min-h-screen flex-1 flex-col md:pl-64">
              <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
                {children}
              </main>
            </div>
          </div>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
