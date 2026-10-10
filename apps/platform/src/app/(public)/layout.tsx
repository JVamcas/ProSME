import type { Metadata } from "next";
import localFont from "next/font/local";
import { PublicSiteShell } from "@/modules/content/ui/public/PublicSiteShell";
import { QueryProvider } from "@/shared/ui/portal/query-provider";
import { WebsiteAnalyticsConsent } from "@/modules/reporting/ui/WebsiteAnalyticsConsent";
import { WebsiteHeatmapCollection } from "@/modules/reporting/ui/WebsiteHeatmapCollection";
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
import { Toast } from "@/shared/ui/Toast";
import { ChatbotWidget } from "@/modules/chatbot/ui/public/ChatbotWidget";
import "../globals.css";

// Render each request for funding dates and preview authorization. Explicit
// published-content caches remain enabled (force-dynamic would bypass them).
export const revalidate = 0;

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
          <PublicSiteShell mainClassName="public-content">
            {children}
          </PublicSiteShell>
          <ChatbotWidget />
          <Suspense fallback={null}>
            <WebsiteAnalyticsConsent
              measurementId={getWebsiteAnalyticsMeasurementId()}
            />
            <WebsiteHeatmapCollection enabled={heatmap.collectionEnabled} />
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
