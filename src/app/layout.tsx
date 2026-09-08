import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

const bahnschrift = localFont({ src: "./fonts/bahnschrift.ttf", variable: "--font-bahnschrift" });
const blanquotey = localFont({ src: "./fonts/blanquotey.ttf", variable: "--font-blanquotey" });

export const metadata: Metadata = {
  title: { default: "ProSME Namibia", template: "%s | ProSME Namibia" },
  description: "ProSME funding and business support helping Namibian SMEs grow, innovate and create jobs.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth"><body className={`${bahnschrift.variable} ${blanquotey.variable} font-sans antialiased`}><AppShell>{children}</AppShell><Toaster richColors position="top-right" /></body></html>
  );
}
