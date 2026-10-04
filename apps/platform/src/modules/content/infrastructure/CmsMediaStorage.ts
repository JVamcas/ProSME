import "server-only";

import { randomUUID } from "node:crypto";
import type { CollectionBeforeChangeHook } from "payload";

export const organizeCmsMedia: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
}) => {
  // The GCS adapter adds the environment/CMS root to this document folder.
  // Retain existing prefixes so older assets stay at their original paths.
  data.prefix =
    operation === "create"
      ? `media/${randomUUID()}`
      : (originalDoc?.prefix ?? "");

  return data;
};
