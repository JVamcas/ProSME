import type { CmsImage } from "../ContentTypes";

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
  };
}

export function resourceHref(file: unknown, externalUrl?: string | null) {
  if (externalUrl) return externalUrl;
  return file &&
    typeof file === "object" &&
    "url" in file &&
    typeof file.url === "string"
    ? file.url
    : undefined;
}

