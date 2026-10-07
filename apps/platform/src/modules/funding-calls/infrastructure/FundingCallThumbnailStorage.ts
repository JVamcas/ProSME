import "server-only";

import type { DocumentStorage } from "@/integrations/storage/DocumentStorage";
import {
  fundingCallThumbnailWidth,
  fundingCallThumbnailWidths,
} from "../domain/FundingCallThumbnailPolicy";

// This versioned key layout identifies complete variant sets without changing
// publication snapshots. Older object keys continue to identify a single file.
const variantKeyPattern = /\/thumbnail-v1-[0-9a-f-]+\/1024\.webp$/;

export function fundingCallThumbnailObjectKey(objectKey: string, width?: number) {
  if (!variantKeyPattern.test(objectKey)) return objectKey;
  return objectKey.replace(/1024\.webp$/, `${fundingCallThumbnailWidth(width)}.webp`);
}

export async function deleteFundingCallThumbnailFiles(
  storage: DocumentStorage,
  objectKey: string,
) {
  const keys = variantKeyPattern.test(objectKey)
    ? fundingCallThumbnailWidths.map((width) => fundingCallThumbnailObjectKey(objectKey, width))
    : [objectKey];
  await Promise.allSettled(keys.map((key) => storage.delete(key)));
}
