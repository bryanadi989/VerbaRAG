import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Corporate Smart Knowledge Base",
  description: "RAG-powered Internal Knowledge Assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}