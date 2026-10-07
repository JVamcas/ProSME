import type { CmsImage, CmsImageVariant } from "../ContentTypes";
import { cmsImageSizes } from "../ContentImageSizes";

export function media(value: unknown): CmsImage | undefined {
  if (
    !value ||
    typeof value !== "object" ||
    !("url" in value) ||
    typeof value.url !== "string"
  )
    return undefined;
  return {
    alt: "alt" in value && typeof value.alt === "string" ? value.alt : "",
    height:
      "height" in value && typeof value.height === "number"
        ? value.height
        : undefined,
    url: value.url,
    width:
      "width" in value && typeof value.width === "number"
        ? value.width
        : undefined,
    sizes: imageVariants(value),
  };
}

function imageVariants(value: object): CmsImage["sizes"] {
  if (!("sizes" in value) || !value.sizes || typeof value.sizes !== "object") {
    return undefined;
  }

  const result: NonNullable<CmsImage["sizes"]> = {};
  for (const { name } of cmsImageSizes) {
    const size = (value.sizes as Record<string, unknown>)[name];
    const variant = imageVariant(size);
    if (variant) {
      result[name] = variant;
    }
  }
  return result;
}

function imageVariant(value: unknown): CmsImageVariant | undefined {
  if (
    !value ||
    typeof value !== "object" ||
    !("url" in value) ||
    typeof value.url !== "string" ||
    !value.url
  ) {
    return undefined;
  }

  return {
    url: value.url,
    width:
      "width" in value && typeof value.width === "number"
        ? value.width
        : undefined,
    height:
      "height" in value && typeof value.height === "number"
        ? value.height
        : undefined,
  };
}

export function resourceHref(file: unknown, externalUrl?: string | null) {
  const url = file &&
    typeof file === "object" &&
    "url" in file &&
    typeof file.url === "string"
    ? file.url
    : undefined;
  return url || externalUrl || undefined;
}

export function resourceThumbnail(thumbnail: unknown, file: unknown): CmsImage | undefined {
  const custom = media(thumbnail);
  if (custom) return custom;
  if (!file || typeof file !== "object") return undefined;

  if ("mimeType" in file && typeof file.mimeType === "string" && file.mimeType.startsWith("image/")) {
    return media(file);
  }
  return "documentThumbnail" in file ? media(file.documentThumbnail) : undefined;
}
