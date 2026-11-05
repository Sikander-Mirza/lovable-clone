import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Lovable Clone",
  description: "Describe an app and watch it get built.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Google Search Console site verification */}
        <meta name="google-site-verification" content="lJ3oKLsynphXdbx9KgG4adwYpqoGbOZTUka4NBiFHcg" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
