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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://global-travel-dashboard.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Global Travel Dashboard — 250 countries, one view",
  description:
    "Live weather, exchange rates, travel advisories, earthquakes and AI-written travel briefs for 250 countries — all in one dashboard.",
  keywords: [
    "travel", "dashboard", "countries", "weather", "exchange rates",
    "travel advisory", "3d globe", "ai travel", "world data",
  ],
  authors: [{ name: "Global Travel Dashboard" }],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Global Travel Dashboard",
    title: "Global Travel Dashboard — 250 countries, one view",
    description:
      "Live weather, exchange rates, travel advisories and AI-written travel briefs for 250 countries.",
    images: [
      {
        url: "/og-image.png",
        width: 1440,
        height: 720,
        alt: "Global Travel Dashboard — 250 countries, live data, AI powered",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Global Travel Dashboard — 250 countries, one view",
    description:
      "Live weather, exchange rates, travel advisories and AI-written travel briefs for 250 countries.",
    images: ["/og-image.png"],
  },
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
