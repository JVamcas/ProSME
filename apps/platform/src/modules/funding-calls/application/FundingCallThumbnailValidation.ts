import path from "node:path";

import { RequestValidationError } from "@/lib/resource-errors";
import { fundingCallThumbnailMaximumBytes } from "../api/FundingCallSchemas";

const allowedFiles = {
  ".jpeg": {
    contentType: "image/jpeg",
    signature: Buffer.from([0xff, 0xd8, 0xff]),
  },
  ".jpg": {
    contentType: "image/jpeg",
    signature: Buffer.from([0xff, 0xd8, 0xff]),
  },
  ".png": {
    contentType: "image/png",
    signature: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  },
  ".webp": {
    contentType: "image/webp",
    signature: Buffer.from("RIFF"),
  },
} as const;

function safeFileName(fileName: string) {
  return path.basename(fileName).replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 160);
}

export function validateFundingCallThumbnailSize(bytes: number) {
  if (!bytes || bytes > fundingCallThumbnailMaximumBytes) {
    throw new RequestValidationError(
      "Choose a non-empty thumbnail no larger than 2 MB.",
    );
  }
}

export function validateFundingCallThumbnail(file: File, body: Buffer) {
  validateFundingCallThumbnailSize(body.length);
  const extension = path.extname(file.name).toLowerCase() as keyof typeof allowedFiles;
  const allowed = allowedFiles[extension];
  if (!allowed) {
    throw new RequestValidationError("Choose a JPG, PNG, or WebP thumbnail.");
  }
  if (file.type && file.type !== allowed.contentType) {
    throw new RequestValidationError(
      "The thumbnail type does not match its extension.",
    );
  }
  const signatureMatches = extension === ".webp"
    ? body.subarray(0, 4).equals(allowed.signature)
      && body.subarray(8, 12).equals(Buffer.from("WEBP"))
    : body.subarray(0, allowed.signature.length).equals(allowed.signature);
  if (!signatureMatches) {
    throw new RequestValidationError("The thumbnail content is invalid.");
  }
  return {
    contentType: allowed.contentType,
    extension,
    fileName: safeFileName(file.name),
  };
}
