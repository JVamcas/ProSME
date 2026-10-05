"use client";

import Image from "next/image";

import type { CmsImage as CmsImageValue } from "../../ContentTypes";
import { cmsImageSource, createCmsImageLoader } from "./CmsImageDelivery";

type Props = {
  className?: string;
  image?: CmsImageValue;
  priority?: boolean;
  sizes?: string;
  onError?: () => void;
};

export function CmsImage({
  className,
  image,
  priority,
  onError,
  sizes = "(max-width: 768px) 100vw, 50vw",
}: Props) {
  if (!image) {
    return null;
  }

  const source = cmsImageSource(image, 1600);
  if (!source) {
    return null;
  }

  return (
    <Image
      alt={image.alt}
      className={className}
      height={image.height ?? 900}
      loader={createCmsImageLoader(image)}
      onError={onError}
      priority={priority}
      sizes={sizes}
      src={source}
      unoptimized={/\.svg(?:$|\?)/i.test(source)}
      width={image.width ?? 1200}
    />
  );
}
