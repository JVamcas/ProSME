import type { Metadata } from "next";

import { EmptyState } from "@/components/ui/empty-state";
import { ContentListingCard } from "@/modules/content/ui/public/ContentListingCard";
import { PublicPageHeader } from "@/modules/content/ui/public/PublicPageHeader";
import { contentMetadata } from "@/modules/content/ContentMetadata";
import { getNews, getPage } from "@/modules/content/ServerContentQueries";


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
                <ContentListingCard
                  key={item.id}
                  item={item}
                  kind="news"
                  headingAs="h2"
                />
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
