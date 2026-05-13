import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  weight: ["600", "700"],
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  weight: ["400", "600"],
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const siteUrl = "https://cinefill.ovie.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "cinefill — a quiet film & TV diary",
    template: "%s | cinefill",
  },
  description:
    "Track films and TV without an audience. Log what you watched, save what's next, see your taste take shape. Local-first with optional personal sync.",
  keywords: [
    "film diary",
    "movie diary",
    "TV diary",
    "watchlist",
    "film tracker",
    "letterboxd alternative",
    "private film log",
    "local-first",
    "TMDB",
    "taste tracker",
  ],
  authors: [{ name: "cinefill" }],
  creator: "cinefill",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "cinefill",
    title: "cinefill — a quiet film & TV diary",
    description:
      "Log films and TV. Save what's next. Watch your taste take shape. No accounts, no audience, optional personal sync.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "cinefill — a quiet film & TV diary",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "cinefill — a quiet film & TV diary",
    description:
      "Log films and TV. Save what's next. Watch your taste take shape. No audience required.",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/icon.png",
  },
};

export const viewport = {
  themeColor: "#0F1216",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
