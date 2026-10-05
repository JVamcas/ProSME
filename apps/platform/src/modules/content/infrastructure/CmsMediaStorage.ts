import "server-only";

import { randomUUID } from "node:crypto";
import type { CollectionBeforeChangeHook } from "payload";

export function isCmsMediaPrefix(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

export const organizeCmsMedia: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation === "create" || req.file) {
    // Every upload gets a new folder, including replacement files.
    data.prefix = `media/${randomUUID()}`;
  } else if (isCmsMediaPrefix(originalDoc?.prefix)) {
    data.prefix = originalDoc.prefix;
  } else {
    throw new Error("Migrate this media record or replace its file before saving.");
  }

  return data;
};
