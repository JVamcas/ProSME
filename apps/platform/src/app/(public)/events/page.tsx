import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { CmsImage } from "@/components/public/cms-image";
import { PublicPageHeader } from "@/components/public/public-page-header";
import { contentMetadata } from "@/modules/content/ContentMetadata";
import { getEvents, getPage } from "@/modules/content/ServerContentQueries";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("events");
  return page ? contentMetadata(page) : {};
}

export default async function EventsPage() {
  const [events, page] = await Promise.all([getEvents(), getPage("events")]);
  return (
    <>
      <PublicPageHeader
        eyebrow="Programme calendar"
        image={page?.image}
        title={page?.title ?? ""}
        summary={page?.summary ?? ""}
      />
      <section className="section bg-slate-50">
        <div className="container">
          {events.length ? (
            <div className="grid gap-5 md:grid-cols-2">
              {events.map((item) => (
                <article
                  className="card flex min-h-64 flex-col overflow-hidden"
                  key={item.id}
                >
                  <CmsImage
                    className="aspect-video w-full object-cover"
                    image={item.image}
                  />
                  <div className="flex flex-1 flex-col p-6">
                    <p className="flex items-center gap-2 text-xs font-bold text-brand-navy">
                      <CalendarDays className="size-4 text-brand-orange" />
                      {item.date
                        ? new Intl.DateTimeFormat("en-NA", {
                            dateStyle: "long",
                            timeStyle: "short",
                          }).format(new Date(item.date))
                        : "Date to be confirmed"}
                    </p>
                    <h2 className="mt-4 text-xl font-bold text-navy">
                      {item.title}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {item.summary}
                    </p>
                    <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                      <MapPin className="size-4 text-brand-orange" />
                      {item.location}
                    </p>
                    <Link
                      href={`/events/${item.slug}`}
                      className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-bold text-brand-navy"
                    >
                      Event details{" "}
                      <ArrowRight className="size-4 text-brand-orange" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No events are scheduled"
              message="There are no published SME Fund events at present. New briefings and workshops will be listed here."
            />
          )}
        </div>
      </section>
    </>
  );
}
