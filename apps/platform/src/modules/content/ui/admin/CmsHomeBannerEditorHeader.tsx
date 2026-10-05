"use client";

import { useEffect, useRef } from "react";

import { homeBannerEditor } from "./HomeBannerEditorNavigation";

export default function CmsHomeBannerEditorHeader() {
  const heading = useRef<HTMLElement>(null);

  useEffect(() => {
    function revealBanner() {
      if (window.location.hash === `#${homeBannerEditor.anchor}`) {
        heading.current?.scrollIntoView({ block: "start" });
      }
    }

    const frame = requestAnimationFrame(revealBanner);
    window.addEventListener("hashchange", revealBanner);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", revealBanner);
    };
  }, []);

  return (
    <section id={homeBannerEditor.anchor} ref={heading}>
      <h2 className="m-0 text-2xl font-bold text-brand-navy">
        {homeBannerEditor.title}
      </h2>
      <p className="mt-2 mb-0 text-sm leading-6 text-brand-navy/75">
        Edit the first section visitors see on Home. Save a draft, preview the
        page, then publish when it is ready.
      </p>
    </section>
  );
}
