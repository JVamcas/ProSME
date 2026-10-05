"use client";

import { GroupField } from "@payloadcms/ui";
import type { GroupFieldClientProps } from "payload";

import { HomeHero } from "../public/HomeHero";
import CmsHomeBannerEditorHeader from "./CmsHomeBannerEditorHeader";
import { useHomeBannerPreview } from "./useHomeBannerPreview";

export default function CmsHomeBannerGroupField(props: GroupFieldClientProps) {
  const content = useHomeBannerPreview();

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-solid border-brand-navy/15 bg-brand-white font-sans text-brand-navy shadow-sm">
      <div className="border-b border-solid border-brand-navy/10 p-6">
        <CmsHomeBannerEditorHeader />
      </div>
      <div className="border-b border-solid border-brand-navy/10 bg-brand-navy/5 p-4">
        <p className="m-0 mb-3 text-xs font-bold uppercase tracking-widest text-brand-navy/70">
          Live banner preview
        </p>
        <div
          inert
          className="overflow-hidden rounded-xl bg-brand-white"
        >
          <HomeHero content={content} />
        </div>
        <p className="mt-3 mb-0 text-xs text-brand-navy/70">
          Changes appear here as you edit. Save a draft or publish using the
          page controls.
        </p>
      </div>
      <div className="p-6 [&_.group-field]:rounded-xl [&_.group-field]:border-brand-navy/15 [&_.group-field]:bg-brand-white [&_.group-field__title]:font-bold [&_.group-field__title]:text-brand-navy [&_.field-label]:font-semibold [&_.field-label]:text-brand-navy [&_input]:rounded-xl [&_input]:border-brand-navy/25 [&_textarea]:rounded-xl [&_textarea]:border-brand-navy/25">
        <GroupField {...props} />
      </div>
    </section>
  );
}
