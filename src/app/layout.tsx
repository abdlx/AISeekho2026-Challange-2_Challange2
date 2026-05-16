import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AISO | AI Service Orchestrator",
  description: "Secure agentic service orchestration powered by Google Antigravity",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <head>
        {/* Runtime env injection — MUST be in head to run before React hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window._env_ = {"NEXT_PUBLIC_SUPABASE_URL":"${process.env.NEXT_PUBLIC_SUPABASE_URL || ''}","NEXT_PUBLIC_SUPABASE_ANON_KEY":"${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}","NEXT_PUBLIC_GOOGLE_MAPS_API_KEY":"${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}"}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
