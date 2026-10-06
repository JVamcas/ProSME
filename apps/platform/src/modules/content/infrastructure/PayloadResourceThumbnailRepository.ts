import "server-only";

import type { PayloadRequest } from "payload";

export async function createDocumentThumbnail(
  req: PayloadRequest,
  preview: Buffer,
  alt: string,
): Promise<number> {
  const thumbnail = await req.payload.create({
    collection: "media",
    data: { alt: `First page of ${alt}` },
    file: {
      data: preview,
      mimetype: "image/png",
      name: "document-preview.png",
      size: preview.length,
    },
    depth: 0,
    overrideAccess: false,
    // Share the authenticated request and database transaction with the upload.
    req,
  });
  return thumbnail.id;
}
