import path from "node:path";

import { RequestValidationError } from "@/lib/resource-errors";
import { brandingLogoMaximumBytes } from "../api/BrandingSchemas";

const allowedFiles = {
  ".jpeg": { contentType: "image/jpeg", signature: Buffer.from([0xff, 0xd8, 0xff]) },
  ".jpg": { contentType: "image/jpeg", signature: Buffer.from([0xff, 0xd8, 0xff]) },
  ".png": {
    contentType: "image/png",
    signature: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  },
  ".svg": { contentType: "image/svg+xml", signature: Buffer.from("<svg") },
  ".webp": { contentType: "image/webp", signature: Buffer.from("RIFF") },
} as const;

function safeSvg(body: Buffer) {
  const source = body.toString("utf8").trim();
  return source.startsWith("<svg")
    && !/<(?:script|foreignObject|iframe|object|embed|image|use|style)\b/i.test(source)
    && !/\son[a-z]+\s*=|(?:javascript|vbscript|data)\s*:|(?:href|url)\s*[=(]/i.test(source);
}

function safeFileName(fileName: string) {
  return path.basename(fileName).replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 160);
}

export function validateBrandingLogo(file: File, body: Buffer) {
  if (!body.length || body.length > brandingLogoMaximumBytes) {
    throw new RequestValidationError("Choose a non-empty logo no larger than 2 MB.");
  }
  const extension = path.extname(file.name).toLowerCase() as keyof typeof allowedFiles;
  const allowed = allowedFiles[extension];
  if (!allowed) {
    throw new RequestValidationError("Choose a PNG, JPEG, WebP, or SVG logo.");
  }
  if (file.type && file.type !== allowed.contentType) {
    throw new RequestValidationError("The logo type does not match its extension.");
  }
  const signatureMatches = extension === ".svg"
    ? safeSvg(body)
    : extension === ".webp"
      ? body.subarray(0, 4).equals(allowed.signature)
        && body.subarray(8, 12).equals(Buffer.from("WEBP"))
      : body.subarray(0, allowed.signature.length).equals(allowed.signature);
  if (!signatureMatches) {
    throw new RequestValidationError("The logo content is invalid or unsafe.");
  }
  return {
    contentType: allowed.contentType,
    extension,
    fileName: safeFileName(file.name),
  };
}
