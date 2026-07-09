import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { getRequestLocale } from "@/i18n/request-locale";
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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-screen flex-col overflow-x-clip bg-white text-zinc-900 dark:bg-black dark:text-zinc-100">
        <Providers initialLocale={locale}>
          <div className="flex min-h-screen min-w-0 flex-1 flex-col">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
