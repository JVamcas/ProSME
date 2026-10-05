import "server-only";

import type { Media } from "@/payload-types";
import type { DocumentStorage } from "@/integrations/storage/DocumentStorage";
import {
  gcsObjectPathSegments,
  resolveGcsObjectPath,
} from "@/integrations/storage/GcsObjectPath";
import { cmsImageSizes } from "./ContentImageSizes";
import { isCmsMediaPrefix } from "./infrastructure/CmsMediaStorage";
import type { PayloadMediaMigrationRepository } from "./infrastructure/PayloadMediaMigrationRepository";

type Dependencies = {
  repository: Pick<PayloadMediaMigrationRepository, "batch" | "replace">;
  storage: DocumentStorage;
  report?: (message: string) => void;
  sourceFiles?: ReadonlyMap<
    string,
    { body: Buffer; width?: number; height?: number }
  >;
};

function objectKey(prefix: string | null | undefined, filename: string) {
  return resolveGcsObjectPath(
    ...gcsObjectPathSegments.cms,
    ...(prefix ? [prefix] : []),
    filename,
  );
}

function hasGeneratedSizes(record: Media) {
  if (!record.mimeType?.startsWith("image/") || record.mimeType === "image/svg+xml") {
    return true;
  }

  // withoutEnlargement retains original dimensions for larger requested sizes.
  return cmsImageSizes.every(({ name }) => {
    const variant = record.sizes?.[name];
    return Boolean(variant?.filename && variant.width && variant.height);
  });
}

function filenames(record: Media) {
  return new Set(
    [
      record.filename,
      ...Object.values(record.sizes ?? {}).map((size) => size?.filename),
    ].filter((filename): filename is string => Boolean(filename)),
  );
}

async function migrateRecord(
  record: Media,
  { repository, storage, sourceFiles }: Dependencies,
) {
  if (!record.filename) {
    throw new Error(`Media ${record.id} has no original filename.`);
  }

  const sourceFile = sourceFiles?.get(record.filename);
  if (
    sourceFile &&
    (sourceFile.body.length !== record.filesize ||
      sourceFile.width !== record.width ||
      sourceFile.height !== record.height)
  ) {
    throw new Error(`Media ${record.id} does not match the supplied original.`);
  }

  const original = sourceFile
    ? sourceFile.body
    : await storage.read(objectKey(record.prefix, record.filename));
  const updated = await repository.replace(record, original);

  if (!isCmsMediaPrefix(updated.prefix) || !hasGeneratedSizes(updated)) {
    throw new Error(`Media ${record.id} did not finish migration.`);
  }

  const saved = await storage.read(objectKey(updated.prefix, updated.filename!));
  if (!saved.equals(original)) {
    throw new Error(`Media ${record.id} original verification failed.`);
  }

  // Confirm the generated objects exist before removing the previous copies.
  const currentKeys = new Set(
    [...filenames(updated)].map((filename) => objectKey(updated.prefix, filename)),
  );
  await Promise.all([...currentKeys].map((key) => storage.read(key)));
  const previousKeys = [...filenames(record)]
    .map((filename) => objectKey(record.prefix, filename))
    .filter((key) => !currentKeys.has(key));
  await Promise.all(previousKeys.map((key) => storage.delete(key)));
}

/** Operator-only data migration; no browser or HTTP entry point. */
export async function migrateCmsMedia(dependencies: Dependencies) {
  let afterId = 0;
  let migrated = 0;
  let skipped = 0;
  const failures: number[] = [];

  while (true) {
    const records = await dependencies.repository.batch(afterId);
    if (!records.length) {
      break;
    }

    for (const record of records) {
      afterId = record.id;
      if (isCmsMediaPrefix(record.prefix) && hasGeneratedSizes(record)) {
        skipped += 1;
        continue;
      }

      try {
        await migrateRecord(record, dependencies);
        migrated += 1;
        dependencies.report?.(`Migrated CMS media ${record.id}.`);
      } catch (error) {
        failures.push(record.id);
        const message = error instanceof Error ? error.message : "Unknown error";
        dependencies.report?.(`CMS media ${record.id}: ${message}`);
      }
    }
  }

  return { migrated, skipped, failures };
}
