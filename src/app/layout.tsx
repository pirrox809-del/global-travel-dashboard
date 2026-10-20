import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/app/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Global Travel Dashboard — 189 countries, one view",
  description:
    "Weather, exchange rates, travel advisories, and local info for 189 countries — all in one dashboard.",
  keywords: ["travel", "dashboard", "countries", "weather", "exchange rates", "travel advisory"],
  authors: [{ name: "Global Travel Dashboard" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          <div className="dashboard-bg min-h-screen">
            {children}
          </div>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
