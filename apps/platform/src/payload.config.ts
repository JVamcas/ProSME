import path from "node:path";
import { fileURLToPath } from "node:url";

import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { gcsStorage } from "@payloadcms/storage-gcs";
import { buildConfig } from "payload";
import sharp from "sharp";

import { getServerEnvironment } from "@/lib/env/server";
import { gcsObjectPrefixes } from "@/integrations/storage/GcsObjectPrefixes";
import { getGoogleCloudStorageOptions } from "@/integrations/storage/GoogleCloudStorageOptions";
import { Media } from "@/payload/collections/content/Media";
import { ContactSubmissions } from "@/payload/collections/content/ContactSubmissions";
import { Events } from "@/payload/collections/content/Events";
import { FAQs } from "@/payload/collections/content/FAQs";
import { News } from "@/payload/collections/content/News";
import { NewsletterSubscriptions } from "@/payload/collections/content/NewsletterSubscriptions";
import { Pages } from "@/payload/collections/content/Pages";
import { Resources } from "@/payload/collections/content/Resources";
import { EligibilityContent } from "@/payload/collections/programme/EligibilityContent";
import { ProgrammeStatistics } from "@/payload/collections/programme/ProgrammeStatistics";
import { CmsPrincipals } from "@/payload/collections/system/CmsPrincipals";
import { ContentAuditEntries } from "@/payload/collections/system/ContentAuditEntries";
import { ContactDetails } from "@/payload/globals/ContactDetails";
import { Footer } from "@/payload/globals/Footer";
import { Header } from "@/payload/globals/Header";
import { Homepage } from "@/payload/globals/Homepage";
import { SiteSettings } from "@/payload/globals/SiteSettings";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const environment = getServerEnvironment();

export default buildConfig({
  bin: [
    {
      key: "seed-database",
      scriptPath: path.resolve(dirname, "payload/seed/seed.ts"),
    },
  ],
  admin: {
    importMap: {
      baseDir: path.resolve(dirname),
      importMapFile: path.resolve(dirname, "app/(payload)/cms/importMap.js"),
    },
    meta: { titleSuffix: " | ProSME CMS" },
    user: "cms-principals",
  },
  collections: [
    CmsPrincipals,
    Media,
    Pages,
    News,
    Resources,
    Events,
    FAQs,
    EligibilityContent,
    ProgrammeStatistics,
    ContactSubmissions,
    NewsletterSubscriptions,
    ContentAuditEntries,
  ],
  db: postgresAdapter({
    migrationDir: path.resolve(dirname, "payload/migrations"),
    pool: { connectionString: environment.DATABASE_URL },
    push: false,
  }),
  editor: lexicalEditor(),
  globals: [Header, Footer, Homepage, ContactDetails, SiteSettings],
  plugins: [
    gcsStorage({
      alwaysInsertFields: true,
      bucket: environment.GCS_DOCUMENTS_BUCKET ?? "local-storage-disabled",
      collections: {
        media: { prefix: gcsObjectPrefixes.cms },
      },
      enabled: Boolean(environment.GCS_DOCUMENTS_BUCKET),
      options: getGoogleCloudStorageOptions(),
      useCompositePrefixes: true,
    }),
  ],
  secret: environment.PAYLOAD_SECRET,
  serverURL: environment.PUBLIC_SITE_URL,
  routes: { admin: "/cms" },
  sharp,
  typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
});
