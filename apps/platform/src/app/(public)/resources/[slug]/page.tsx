import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GeneralButtonLink } from "@/components/ui/button";
import { contentMetadata } from "@/modules/content/ContentMetadata";
import { getResource } from "@/modules/content/ServerResourceCentreService";
import { CmsImage } from "@/modules/content/ui/public/CmsImage";
import { CmsRichText } from "@/modules/content/ui/public/CmsRichText";
import { PublicPageHeader } from "@/modules/content/ui/public/PublicPageHeader";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resource = await getResource((await params).slug);
  return resource ? contentMetadata(resource) : {};
}

export default async function ResourceDetailPage({ params }: Props) {
  const resource = await getResource((await params).slug);
  if (!resource) notFound();

  return (
    <>
      <PublicPageHeader
        eyebrow={resource.category ?? "Resource Centre"}
        title={resource.title}
        summary={resource.summary}
      />
      <article className="section">
        <div className="container max-w-3xl space-y-6">
          <CmsImage
            image={resource.image}
            className="mx-auto max-h-96 w-auto rounded-xl object-contain"
          />
          {resource.body ? <CmsRichText data={resource.body} /> : null}
          <div className="flex flex-wrap gap-3">
            {resource.href ? (
              <GeneralButtonLink
                href={resource.href}
                rel="noopener noreferrer"
                target="_blank"
              >
                Open document
                <span className="sr-only"> (opens in a new tab)</span>
              </GeneralButtonLink>
            ) : null}
            <GeneralButtonLink href="/resources" variant="outline">
              Back to Resource Centre
            </GeneralButtonLink>
          </div>
        </div>
      </article>
    </>
  );
}
