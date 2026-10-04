import type { ImageLoaderProps } from "next/image";

import type { CmsImage, CmsImageVariant } from "../../ContentTypes";

export function cmsImageSource(image: CmsImage, width: number): string {
  const variants = Object.values(image.sizes ?? {})
    .filter(
      (variant): variant is CmsImageVariant & { width: number } =>
        Boolean(variant?.url) &&
        typeof variant?.width === "number" &&
        variant.width > 0,
    )
    .sort((left, right) => left.width - right.width);
  const variant =
    variants.find((candidate) => candidate.width >= width) ?? variants.at(-1);

  return sameOriginMediaUrl(variant?.url ?? image.url);
}

export function createCmsImageLoader(image: CmsImage) {
  return ({ width, quality }: ImageLoaderProps) => {
    const source = cmsImageSource(image, width);
    return `/_next/image?url=${encodeURIComponent(source)}&w=${width}&q=${quality ?? 75}`;
  };
}

function sameOriginMediaUrl(value: string) {
  try {
    const url = new URL(value);
    return url.pathname.startsWith("/api/media/file/")
      ? `${url.pathname}${url.search}`
      : value;
  } catch {
    return value;
  }
}
