"use client";

import { useState } from "react";
import { CmsImage } from "../public/CmsImage";

export function CmsGuideImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className="cms-home-section__image-placeholder"
        role="img"
        aria-label="Image preview unavailable"
      >
        Image preview unavailable
      </div>
    );
  }

  return (
    <CmsImage
      className="cms-home-section__image"
      image={{ url: src, alt: "", width: 180, height: 120 }}
      onError={() => setFailed(true)}
      sizes="180px"
    />
  );
}
