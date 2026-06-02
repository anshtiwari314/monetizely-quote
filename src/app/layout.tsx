import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Monetizely Quote",
  description: "Lightweight SaaS quoting tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Browser extensions (e.g. Bitdefender) inject bis_skin_checked on <head> children */}
      <head suppressHydrationWarning />
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <div suppressHydrationWarning className="contents">
          {children}
        </div>
      </body>
    </html>
  );
}
