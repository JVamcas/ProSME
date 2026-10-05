import type { ImageLoaderProps } from "next/image";

import type { CmsImage, CmsImageVariant } from "../../ContentTypes";
import { cmsImageSizes } from "../../ContentImageSizes";

export function cmsImageSource(image: CmsImage, width: number): string | undefined {
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

  if (variant) {
    return sameOriginMediaUrl(variant.url);
  }

  const isVector = /\.svg(?:$|\?)/i.test(image.url);
  const isSmallOriginal =
    typeof image.width === "number" && image.width < cmsImageSizes[0].width;
  if (isVector || isSmallOriginal) {
    return sameOriginMediaUrl(image.url);
  }

  return undefined;
}

export function createCmsImageLoader(image: CmsImage) {
  return ({ width, quality }: ImageLoaderProps) => {
    const source = cmsImageSource(image, width);
    if (!source) {
      throw new Error("CMS image has no generated sizes. Run the media migration.");
    }
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
