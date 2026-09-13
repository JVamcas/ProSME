import { CalendarDays, Download, Newspaper } from "lucide-react";

import { getNews, getResources } from "@/modules/content/ServerContentQueries";
import { ArrowLink } from "@/components/ui/arrow-link";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "./section-heading";
import { CmsImage } from "./cms-image";

export async function HomeFunding({
  heading,
  limit = 4,
}: {
  heading: string;
  limit?: number;
}) {
  const [news, resources] = await Promise.all([getNews(), getResources()]);
  const newsLimit = Math.min(2, limit);
  const latestNews = news.slice(0, newsLimit);
  const items = [
    ...latestNews.map((item) => ({
      ...item,
      type: "News",
      href: `/news/${item.slug}`,
    })),
    ...resources.slice(0, limit - latestNews.length).map((item) => ({
      ...item,
      type: item.category ?? "Resource",
      href: item.href ?? `/resources/${item.slug}`,
    })),
  ].slice(0, limit);

  return (
    <section className="container py-14">
      <SectionHeading
        title={heading}
        text="Updates, stories and useful materials for Namibian entrepreneurs."
        link="Browse resources"
        href="/resources"
      />
      {!items.length ? (
        <div className="mt-6">
          <EmptyState
            title="News and resources coming soon"
            message="Published programme updates and application resources will appear here."
          />
        </div>
      ) : null}
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {items.map((item) => (
          <article
            className="funding-card flex min-h-72 flex-col overflow-hidden rounded-xl border border-brand-blue/20 bg-white"
            key={`${item.type}-${item.slug}`}
          >
            {item.image ? (
              <CmsImage
                className="aspect-video w-full object-cover"
                image={item.image}
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            ) : (
              <div className="grid aspect-video place-items-center bg-brand-cream text-brand-orange">
                {item.type === "News" ? (
                  <Newspaper className="size-10" />
                ) : (
                  <Download className="size-10" />
                )}
              </div>
            )}
            <div className="flex flex-1 flex-col p-6">
              <span className="grid size-11 place-items-center rounded-full bg-brand-cream text-brand-orange">
                {item.type === "News" ? (
                  <Newspaper className="size-5" />
                ) : (
                  <Download className="size-5" />
                )}
              </span>
              <p className="mt-5 text-xs font-extrabold uppercase tracking-wider text-brand-navy">
                {item.type}
              </p>
              <h3 className="mt-2 text-xl font-bold text-brand-navy">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-brand-navy">
                {item.summary}
              </p>
              {item.date ? (
                <p className="mt-4 flex items-center gap-2 text-xs text-brand-navy">
                  <CalendarDays className="size-4 text-brand-orange" />
                  {new Intl.DateTimeFormat("en-NA", {
                    dateStyle: "medium",
                  }).format(new Date(item.date))}
                </p>
              ) : null}
              <ArrowLink href={item.href} className="mt-auto pt-6 underline">
                {item.type === "News" ? "Read update" : "Open resource"}
              </ArrowLink>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
