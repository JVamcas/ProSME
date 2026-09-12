import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { AnalyticsConsent } from "@/integrations/analytics/analytics-consent";
import { getContactDetails, getSiteSettings } from "@/modules/content/content.queries";
import "../globals.css";

const bahnschrift = localFont({ src: "../fonts/bahnschrift.ttf", variable: "--font-bahnschrift", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const images = settings.defaultSocialImage ? [{ alt: settings.defaultSocialImage.alt, url: settings.defaultSocialImage.url }] : undefined;
  return { description: settings.siteDescription, metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.smefund.na"), openGraph: { images, locale: "en_NA", siteName: settings.siteName, type: "website" }, robots: settings.allowIndexing ? undefined : { follow: false, index: false }, title: { default: settings.siteName, template: `%s | ${settings.siteName}` } };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [settings, contact] = await Promise.all([getSiteSettings(), getContactDetails()]);
  return (
    <html lang="en" data-scroll-behavior="smooth" className={bahnschrift.variable}><body className="font-sans antialiased"><AppShell mainClassName="public-content">{children}</AppShell><AnalyticsConsent measurementId={settings.analyticsMeasurementId} /><Toaster richColors position="top-right" /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: settings.siteName, email: contact.email, url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.smefund.na", parentOrganization: { "@type": "Organization", name: "ProSME Project" } }) }} /></body></html>
  );
}
