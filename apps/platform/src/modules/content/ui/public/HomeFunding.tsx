import { CalendarDays, Download, Newspaper } from "lucide-react";

import { CmsImage } from "@/components/public/cms-image";
import { SectionHeading } from "@/components/public/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowLink } from "@/components/ui/links";
import { getHomeNewsAndResources } from "@/modules/content/ServerContentQueries";

export async function HomeFunding({
  heading,
  introduction = "Updates, stories and useful materials for Namibian entrepreneurs.",
}: {
  heading: string;
  introduction?: string;
}) {
  const { news, resources } = await getHomeNewsAndResources();
  const items = [
    ...news.map((item) => ({
      ...item,
      type: "News",
      href: `/news/${item.slug}`,
    })),
    ...resources.map((item) => ({
      ...item,
      type: item.category ?? "Resource",
      href: item.href ?? `/resources/${item.slug}`,
    })),
  ];

  return (
    <section className="container py-14">
      <SectionHeading
        title={heading}
        text={introduction}
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
      <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const isResource = item.type !== "News";

          return (
            <article
              className="funding-card flex min-h-72 flex-col overflow-hidden rounded-xl border border-brand-blue/20 bg-white"
              key={`${item.type}-${item.slug}`}
            >
              {item.image ? (
                <CmsImage
                  className="aspect-video w-full object-cover object-top"
                  image={item.image}
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              ) : (
                <div className="grid aspect-video place-items-center bg-brand-cream text-brand-orange">
                  {isResource ? (
                    <Download className="size-10" />
                  ) : (
                    <Newspaper className="size-10" />
                  )}
                </div>
              )}
              <div className="flex flex-1 flex-col p-6">
                <span className="grid size-11 place-items-center rounded-full bg-brand-cream text-brand-orange">
                  {isResource ? (
                    <Download className="size-5" />
                  ) : (
                    <Newspaper className="size-5" />
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
                <ArrowLink
                  className="mt-auto pt-6 underline"
                  href={item.href}
                  rel={isResource ? "noopener noreferrer" : undefined}
                  target={isResource ? "_blank" : undefined}
                >
                  {isResource ? "Open resource" : "Read update"}
                  {isResource ? (
                    <span className="sr-only"> (opens in a new tab)</span>
                  ) : null}
                </ArrowLink>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
