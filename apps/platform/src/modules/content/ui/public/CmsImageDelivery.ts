import type { ImageLoaderProps } from "next/image";

import type { CmsImage, CmsImageVariant } from "../../ContentTypes";

export function cmsImageSource(image: CmsImage, width: number): string | undefined {
  const variants = Object.values(image.sizes ?? {})
    .filter(
      (variant): variant is CmsImageVariant & { width: number } =>
        Boolean(variant?.url) &&
        /\.webp(?:$|\?)/i.test(variant?.url ?? "") &&
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
  if (isVector) {
    return sameOriginMediaUrl(image.url);
  }

  return undefined;
}

export function createCmsImageLoader(image: CmsImage) {
  return ({ width }: ImageLoaderProps) => {
    const source = cmsImageSource(image, width);
    if (!source) {
      throw new Error("CMS image has no generated WebP sizes. Run the media migration.");
    }
    return source;
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
