import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
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
  title: "Numerae — Finanças pessoais",
  description:
    "Organize suas finanças, metas e orçamentos com clareza e segurança.",
  metadataBase: new URL("https://numerae.vercel.app"),
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-screen flex-col overflow-x-clip bg-white text-zinc-900 dark:bg-black dark:text-zinc-100">
        <Providers>
          <div className="flex min-h-screen min-w-0 flex-1 flex-col">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
