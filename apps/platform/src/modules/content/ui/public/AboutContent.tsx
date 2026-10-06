import type { PublicPageContent } from "../../ContentTypes";
import { CmsRichText } from "./CmsRichText";
import { PublicPageHeader } from "./PublicPageHeader";

export function AboutContent({ page }: { page: PublicPageContent }) {
  return (
    <>
      <PublicPageHeader
        eyebrow="About us"
        image={page.image}
        title={page.title}
        summary={page.summary}
      />
      <section className="section bg-white">
        <div className="container max-w-3xl text-lg leading-8 text-slate-700">
          {page.content ? <CmsRichText data={page.content} /> : null}
        </div>
      </section>
    </>
  );
}
