import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lovable Clone",
  description: "Describe an app, watch it get built.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
