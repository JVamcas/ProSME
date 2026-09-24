import Image from "next/image";

import type { CmsImage as CmsImageValue } from "@/modules/content/ContentTypes";

type Props = {
  className?: string;
  image?: CmsImageValue;
  priority?: boolean;
  sizes?: string;
};

export function CmsImage({
  className,
  image,
  priority,
  sizes = "(max-width: 768px) 100vw, 50vw",
}: Props) {
  if (!image) return null;

  const source = sameOriginMediaUrl(image.url);

  return (
    <Image
      alt={image.alt}
      className={className}
      height={image.height ?? 900}
      priority={priority}
      sizes={sizes}
      src={source}
      unoptimized={isPayloadMediaUrl(source)}
      width={image.width ?? 1200}
    />
  );
}

function sameOriginMediaUrl(value: string) {
  try {
    const url = new URL(value);
    return url.pathname.startsWith("/api/media/file/") ? `${url.pathname}${url.search}` : value;
  } catch {
    return value;
  }
}

function isPayloadMediaUrl(value: string) {
  return value.startsWith("/api/media/file/");
}
