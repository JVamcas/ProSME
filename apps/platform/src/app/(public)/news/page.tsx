import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";

import { EmptyState } from "@/components/public/empty-state";
import { CmsImage } from "@/components/public/cms-image";
import { PublicPageHeader } from "@/components/public/public-page-header";
import { contentMetadata } from "@/modules/content/content.metadata";
import { getNews, getPage } from "@/modules/content/content.queries";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("news");
  return page ? contentMetadata(page) : {};
}

export default async function NewsPage() {
  const [news, page] = await Promise.all([getNews(), getPage("news")]);
  return (
    <>
      <PublicPageHeader
        eyebrow="Updates"
        image={page?.image}
        title={page?.title ?? ""}
        summary={page?.summary ?? ""}
      />
      <section className="section bg-slate-50">
        <div className="container">
          {news.length ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {news.map((item) => (
                <article
                  className="card flex min-h-64 flex-col overflow-hidden"
                  key={item.id}
                >
                  <CmsImage
                    className="aspect-video w-full object-cover"
                    image={item.image}
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="flex flex-1 flex-col p-6">
                    <p className="flex items-center gap-2 text-xs font-bold text-brand-navy">
                      <CalendarDays className="size-4 text-brand-orange" />
                      {item.date
                        ? new Intl.DateTimeFormat("en-NA", {
                            dateStyle: "medium",
                          }).format(new Date(item.date))
                        : "Programme update"}
                    </p>
                    <h2 className="mt-4 text-xl font-bold text-navy">
                      {item.title}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {item.summary}
                    </p>
                    <Link
                      href={`/news/${item.slug}`}
                      className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-bold text-brand-navy"
                    >
                      Read update{" "}
                      <ArrowRight className="size-4 text-brand-orange" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Updates coming soon"
              message="There are no published news items yet. Please check back for official SME Fund announcements."
            />
          )}
        </div>
      </section>
    </>
  );
}
