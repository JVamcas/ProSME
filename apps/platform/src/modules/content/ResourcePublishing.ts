import type { CollectionBeforeValidateHook } from "payload";
import { APIError } from "payload";
import { prepareContentSlug } from "./ContentSlug";

export const prepareResource: CollectionBeforeValidateHook = (args) => {
  const { data, originalDoc } = args;
  if (!data) return data;

  prepareContentSlug(args);
  data.resourceName ??=
    originalDoc?.resourceName ?? data.category ?? originalDoc?.category;

  const file = data.file === undefined ? originalDoc?.file : data.file;
  const externalUrl =
    data.externalUrl === undefined ? originalDoc?.externalUrl : data.externalUrl;
  const status = data._status ?? originalDoc?._status;
  if (status === "published" && !file && !externalUrl) {
    throw new APIError(
      "Upload a document or provide an existing document link before publishing.",
      422,
    );
  }
  return data;
};
