import { getPayload, type SanitizedConfig } from "payload";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import { GoogleCloudDocumentStorage } from "@/integrations/storage/GoogleCloudDocumentStorage";
import { migrateCmsMedia } from "@/modules/content/ServerCmsMediaMigrationService";
import { PayloadMediaMigrationRepository } from "@/modules/content/infrastructure/PayloadMediaMigrationRepository";

export async function script(config: SanitizedConfig) {
  try {
    await runMigration(config);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

async function runMigration(config: SanitizedConfig) {
  const payload = await getPayload({ config });
  try {
    const result = await migrateCmsMedia({
      repository: new PayloadMediaMigrationRepository(payload),
      storage: new GoogleCloudDocumentStorage(),
      sourceFiles: process.argv.includes("--restore-source-files")
        ? await readSourceFiles()
        : undefined,
      report: (message) => payload.logger.info(message),
    });

    payload.logger.info(result, "CMS media migration finished");
    if (result.failures.length) {
      process.exitCode = 1;
    }
  } finally {
    await payload.destroy();
  }

  if (process.exitCode === 1) {
    process.exit(1);
  }
}

async function readSourceFiles() {
  const paths = [
    "brand/pic2.png",
    "brand/pic3.png",
    "brand/pic5.png",
    "images/first-call-funding-criteria-thumbnail.png",
  ];
  const entries = await Promise.all(
    paths.map(async (path) => {
      const absolutePath = fileURLToPath(
        new URL(`../../../public/${path}`, import.meta.url),
      );
      const body = await readFile(absolutePath);
      const { width, height } = await sharp(body).metadata();
      const filename = path.slice(path.lastIndexOf("/") + 1);
      return [filename, { body, width, height }] as const;
    }),
  );

  return new Map(entries);
}
