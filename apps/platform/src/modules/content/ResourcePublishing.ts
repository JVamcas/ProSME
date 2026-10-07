import type { CollectionBeforeValidateHook } from "payload";
import { APIError } from "payload";

export const prepareResource: CollectionBeforeValidateHook = ({ data, originalDoc }) => {
  if (!data) return data;

  const title = data.title ?? originalDoc?.title;
  if (!data.slug && !originalDoc?.slug && typeof title === "string") {
    data.slug = title
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }
  data.resourceName ??= originalDoc?.resourceName ?? data.category ?? originalDoc?.category;

  const file = data.file === undefined ? originalDoc?.file : data.file;
  const externalUrl = data.externalUrl === undefined ? originalDoc?.externalUrl : data.externalUrl;
  const status = data._status ?? originalDoc?._status;
  if (status === "published" && !file && !externalUrl) {
    throw new APIError("Upload a document or provide an existing document link before publishing.", 422);
  }
  return data;
};
