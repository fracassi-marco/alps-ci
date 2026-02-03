import type { Metadata } from "next";
import { Toaster } from "sonner";
import Image from "next/image";
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
      <body className="antialiased min-h-screen relative">
        {/* Fixed Mountain Background */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <Image
            src="/images/background_sass_de_mura.webp"
            alt="Dolomiti Bellunesi"
            fill
            priority
            className="object-cover"
            quality={75}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAPABQDAREAAhEBAxEB/8QAFwABAAMAAAAAAAAAAAAAAAAABAIGB//EAB4QAAICAgIDAAAAAAAAAAAAAAECAAMEEQUVBiJx/8QAGQEAAgMBAAAAAAAAAAAAAAAAAwQAAQIF/8QAHREAAgICAwEAAAAAAAAAAAAAAAECAxEUBBJBMf/aAAwDAQACEQMRAD8Asvb4pPq4j9lzwLQoXpLsqlGwwIMFDkBJULwUmdQyAlhCbCBa5jK519Khi519nOlb2GUNXnLAgBYxVza+GglvkuUthCudS1NtEyf/2Q=="
          />
          {/* Lighter overlay to make the image more vivid */}
          <div className="absolute inset-0 bg-white/10 dark:bg-black/20" />
        </div>

        <div className="relative z-0">
          {children}
        </div>

        <Toaster
          position="top-center"
          richColors
          closeButton
          theme="system"
        />
      </body>
    </html>
  );
}

