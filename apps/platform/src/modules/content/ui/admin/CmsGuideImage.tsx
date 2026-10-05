"use client";

import { useState } from "react";
import { CmsImage } from "../public/CmsImage";

export function CmsGuideImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className="grid h-30 w-full place-items-center rounded-xl bg-brand-navy/5 p-3 text-center text-sm text-brand-navy"
        role="img"
        aria-label="Image preview unavailable"
      >
        Image preview unavailable
      </div>
    );
  }

  return (
    <CmsImage
      className="h-30 w-full rounded-xl object-cover"
      image={{ url: src, alt: "", width: 180, height: 120 }}
      onError={() => setFailed(true)}
      sizes="180px"
    />
  );
}
