"use client";

import Image, { type ImageLoaderProps } from "next/image";

import { fundingCallThumbnailWidth } from "../domain/FundingCallThumbnailPolicy";

function thumbnailLoader({ src, width }: ImageLoaderProps) {
  const url = new URL(src, "http://thumbnail.local");
  url.searchParams.set("width", String(fundingCallThumbnailWidth(width)));
  return `${url.pathname}${url.search}`;
}

export function FundingCallThumbnailImage({
  alt = "",
  className,
  sizes,
  src,
}: {
  alt?: string;
  className?: string;
  sizes: string;
  src: string;
}) {
  return (
    <Image
      alt={alt}
      className={className}
      fill
      loader={thumbnailLoader}
      sizes={sizes}
      src={src}
    />
  );
}
