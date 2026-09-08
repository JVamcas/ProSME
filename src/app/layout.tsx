import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import "./globals.css";

const bahnschrift = localFont({ src: "./fonts/bahnschrift.ttf", variable: "--font-bahnschrift" });
const blanquotey = localFont({ src: "./fonts/blanquotey.ttf", variable: "--font-blanquotey" });

export const metadata: Metadata = {
  title: { default: "SME Fund Namibia", template: "%s | SME Fund Namibia" },
  description: "Funding and business support helping Namibian SMEs grow, innovate and create jobs.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth"><body className={`${bahnschrift.variable} ${blanquotey.variable} font-sans antialiased`}><SiteHeader /><main>{children}</main><SiteFooter /><Toaster richColors position="top-right" /></body></html>
  );
}
