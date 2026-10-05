import "server-only";

import type { Payload } from "payload";
import type { Media } from "@/payload-types";

export class PayloadMediaMigrationRepository {
  constructor(private readonly payload: Payload) {}

  async batch(afterId: number) {
    const result = await this.payload.find({
      collection: "media",
      depth: 0,
      limit: 25,
      pagination: false,
      overrideAccess: true,
      sort: "id",
      where: { id: { greater_than: afterId } },
      select: {
        id: true,
        alt: true,
        caption: true,
        prefix: true,
        filename: true,
        mimeType: true,
        filesize: true,
        width: true,
        height: true,
        sizes: true,
      },
    });

    return result.docs;
  }

  async replace(record: Media, body: Buffer) {
    if (!record.filename || !record.mimeType) {
      throw new Error(`Media ${record.id} has no original file metadata.`);
    }

    return this.payload.update({
      collection: "media",
      id: record.id,
      depth: 0,
      overrideAccess: true,
      overwriteExistingFiles: true,
      data: { alt: record.alt, caption: record.caption },
      file: {
        data: body,
        mimetype: record.mimeType,
        name: record.filename,
        size: body.length,
      },
    });
  }
}
