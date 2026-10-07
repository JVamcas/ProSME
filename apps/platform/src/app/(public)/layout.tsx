import type { Metadata } from "next";
import localFont from "next/font/local";
import { PublicSiteShell } from "@/modules/content/ui/public/PublicSiteShell";
import { QueryProvider } from "@/shared/ui/portal/query-provider";
import { WebsiteAnalyticsConsent } from "@/modules/reporting/ui/WebsiteAnalyticsConsent";
import { Suspense } from "react";
import {
  getWebsiteAnalyticsMeasurementId,
  getWebsiteHeatmapConfiguration,
} from "@/modules/reporting/ServerWebsiteAnalyticsCollectionService";
import { getServerEnvironment } from "@/lib/env/server";
import {
  getContactDetails,
  getSiteSettings,
} from "@/modules/content/ServerContentQueries";
import { PublicContentRefresh } from "@/modules/content/ui/public/PublicContentRefresh";
import { Toast } from "@/shared/ui/Toast";
import "../globals.css";

// Build-time CMS fallbacks must never become cached public pages.
export const dynamic = "force-dynamic";

const bahnschrift = localFont({
  src: "../fonts/bahnschrift.ttf",
  variable: "--font-bahnschrift",
  display: "swap",
  style: "normal",
  weight: "100 900",
});

export async function generateMetadata(): Promise<Metadata> {
  const environment = getServerEnvironment();
  const settings = await getSiteSettings();
  const images = settings.defaultSocialImage
    ? [
        {
          alt: settings.defaultSocialImage.alt,
          url: settings.defaultSocialImage.url,
        },
      ]
    : undefined;

  return {
    description: settings.siteDescription,
    metadataBase: new URL(environment.PUBLIC_SITE_URL),
    openGraph: {
      images,
      locale: "en_NA",
      siteName: settings.siteName,
      type: "website",
    },
    robots: settings.allowIndexing
      ? undefined
      : {
          follow: false,
          index: false,
        },
    title: {
      default: settings.siteName,
      template: `%s | ${settings.siteName}`,
    },
  };
}

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function RootLayout({ children }: RootLayoutProps) {
  const heatmap = getWebsiteHeatmapConfiguration();
  const environment = getServerEnvironment();
  const [settings, contact] = await Promise.all([
    getSiteSettings(),
    getContactDetails(),
  ]);
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.siteName,
    email: contact.email,
    url: environment.PUBLIC_SITE_URL,
    parentOrganization: {
      "@type": "Organization",
      name: "SME Fund Project",
    },
  };

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={bahnschrift.variable}
    >
      <body className="font-sans antialiased">
        <QueryProvider>
          <PublicContentRefresh />
          <PublicSiteShell mainClassName="public-content">
            {children}
          </PublicSiteShell>
          <Suspense fallback={null}>
            <WebsiteAnalyticsConsent
              measurementId={getWebsiteAnalyticsMeasurementId()}
              clarityProjectId={heatmap.projectId}
            />
          </Suspense>
          <Toast />
        </QueryProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organization),
          }}
        />
      </body>
    </html>
  );
}
