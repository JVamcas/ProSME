import type { CollectionBeforeValidateHook } from "payload";

export const prepareContentSlug: CollectionBeforeValidateHook = ({
  data,
  originalDoc,
}) => {
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

  return data;
};
