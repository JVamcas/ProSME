"use client";

import { useState } from "react";

export function CmsGuideImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="cms-home-section__image-placeholder" role="img" aria-label="Image preview unavailable">
        Image preview unavailable
      </div>
    );
  }

  // Payload media can be local or remote, and a denied read must leave a useful card.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="cms-home-section__image" src={src} alt="" onError={() => setFailed(true)} />;
}
