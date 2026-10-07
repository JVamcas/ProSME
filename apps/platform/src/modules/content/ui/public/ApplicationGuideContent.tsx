import type { ReactNode } from "react";

import { defaultPages } from "../../ContentDefaults";
import type { PublicPageContent } from "../../ContentTypes";
import { CmsRichText } from "./CmsRichText";
import { PublicPageHeader } from "./PublicPageHeader";

export function ApplicationGuideContent({
  page,
  children,
}: {
  page: PublicPageContent;
  children?: ReactNode;
}) {
  return (
    <>
      <PublicPageHeader
        eyebrow={page.eyebrow ?? defaultPages["how-to-apply"].eyebrow ?? ""}
        image={page.image}
        title={page.title}
        summary={page.summary}
      />
      <section className="container py-10">
        <div className="max-w-3xl">
          {children}
          {page.content ? <CmsRichText data={page.content} /> : null}
        </div>
      </section>
    </>
  );
}
