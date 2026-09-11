import path from "node:path";
import { fileURLToPath } from "node:url";

import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";

import { getServerEnvironment } from "@/lib/env/server";
import { Media } from "@/payload/collections/content/Media";
import { News } from "@/payload/collections/content/News";
import { Pages } from "@/payload/collections/content/Pages";
import { Resources } from "@/payload/collections/content/Resources";
import { FundingCalls } from "@/payload/collections/programme/FundingCalls";
import { CmsPrincipals } from "@/payload/collections/system/CmsPrincipals";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const environment = getServerEnvironment();

export default buildConfig({
  admin: {
    importMap: {
      baseDir: path.resolve(dirname),
      importMapFile: path.resolve(dirname, "app/(payload)/cms/importMap.js"),
    },
    meta: { titleSuffix: " | ProSME CMS" },
    user: "cms-principals",
  },
  collections: [CmsPrincipals, Media, Pages, News, Resources, FundingCalls],
  db: postgresAdapter({
    migrationDir: path.resolve(dirname, "payload/migrations"),
    pool: { connectionString: environment.DATABASE_URL },
  }),
  editor: lexicalEditor(),
  secret: environment.PAYLOAD_SECRET,
  serverURL: environment.NEXT_PUBLIC_SITE_URL,
  routes: { admin: "/cms" },
  sharp,
  typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
});
