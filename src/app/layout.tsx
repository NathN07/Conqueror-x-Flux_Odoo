import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brightloop | Subscription Management System",
  description: "End-to-end recurring billing and subscription platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
