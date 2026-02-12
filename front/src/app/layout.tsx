import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { auth, BASE_PATH } from "@/auth";
import "katex/dist/katex.min.css";
import "./globals.css";
import AuthButton from "@/components/auth/AuthButton.server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MathGirl - AI Math Tutor",
  description: "AIキャラクターと対話しながら数学を学ぶ学習アプリ",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider basePath={BASE_PATH} session={session}>
          <div className="fixed top-4 right-4 z-50">
            <AuthButton />
          </div>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
