import type { Metadata } from "next";
import { Download } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { CmsImage } from "@/components/public/cms-image";
import { PublicPageHeader } from "@/components/public/public-page-header";
import { ArrowLink } from "@/components/ui/links";
import { contentMetadata } from "@/modules/content/ContentMetadata";
import { getPage, getResources } from "@/modules/content/ServerContentQueries";


export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("resources");
  return page ? contentMetadata(page) : {};
}

export default async function ResourcesPage() {
  const [resources, page] = await Promise.all([
    getResources(),
    getPage("resources"),
  ]);
  return (
    <>
      <PublicPageHeader
        eyebrow="Resource centre"
        image={page?.image}
        title={page?.title ?? ""}
        summary={page?.summary ?? ""}
      />
      <section className="section bg-brand-cream/30">
        <div className="container">
          {resources.length ? (
            <div className="grid gap-5 md:grid-cols-2">
              {resources.map((item) => (
                <article
                  className="overflow-hidden rounded-2xl border border-brand-blue/25 bg-brand-white shadow-[0_12px_35px_rgba(10,24,59,0.08)]"
                  key={item.id}
                >
                  <CmsImage
                    className="aspect-video w-full object-cover"
                    image={item.image}
                  />
                  <div className="flex items-start gap-5 p-6">
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-orange/10">
                      <Download className="size-5 text-brand-orange" />
                    </span>
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider text-brand-navy">
                        {item.category}
                      </p>
                      <h2 className="mt-2 text-xl font-bold text-brand-navy">
                        {item.title}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-brand-navy/75">
                        {item.summary}
                      </p>
                      <ArrowLink
                        href={item.href ?? `/resources/${item.slug}`}
                        target={
                          item.href?.startsWith("http") ? "_blank" : undefined
                        }
                        className="mt-4 underline"
                      >
                        Open resource
                      </ArrowLink>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Resources coming soon"
              message="Approved documents will appear here when they are published."
            />
          )}
        </div>
      </section>
    </>
  );
}
