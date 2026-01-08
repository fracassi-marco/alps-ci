import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alps-CI",
  description: "CI dashboard for GitHub Actions workflows",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

