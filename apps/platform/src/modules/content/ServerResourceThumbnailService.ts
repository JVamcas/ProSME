import "server-only";

import type { CollectionBeforeChangeHook } from "payload";
import { APIError } from "payload";

import { renderResourceThumbnail } from "./infrastructure/ResourceThumbnailRenderer";
import { createDocumentThumbnail } from "./infrastructure/PayloadResourceThumbnailRepository";
import { resourceDocumentExtensions } from "./ResourceDocumentTypes";

export const generateDocumentThumbnail: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  // Generated previews are server-owned; clients cannot assign this relation.
  data.documentThumbnail = originalDoc?.documentThumbnail ?? null;
  const file = req.file;
  if (!file) return data;

  data.documentThumbnail = null;
  if (!resourceDocumentExtensions[file.mimetype]) return data;

  try {
    const preview = await renderResourceThumbnail(file.data, file.mimetype);
    data.documentThumbnail = await createDocumentThumbnail(
      req,
      preview,
      String(data.alt || file.name),
    );
    return data;
  } catch (error) {
    req.payload.logger.error({ err: error, msg: "Resource thumbnail generation failed" });
    throw new APIError(
      "The document preview could not be generated. Check the file is readable and try again.",
      422,
    );
  } finally {
    // Nested Payload uploads mutate req.file. Keep the parent upload intact.
    req.file = file;
  }
};
