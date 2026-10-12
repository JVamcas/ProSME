import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/shared/ui/EmptyState";
import { contentMetadata } from "@/modules/content/ContentMetadata";
import {
  getEventContentPage,
  getRecordingCategories,
} from "@/modules/content/application/ServerEventContentService";
import { eventTypeOptions } from "@/modules/content/domain/EventMetadata";
import { getPage } from "@/modules/content/ServerContentQueries";
import { EventFeature } from "@/modules/content/ui/public/EventFeature";
import { EventSearchControls } from "@/modules/content/ui/public/EventSearchControls";
import { EventPagination } from "@/modules/content/ui/public/EventPagination";

import { EventRecordingCard } from "@/modules/content/ui/public/EventRecordingCard";
import { EventRecordingSearch } from "@/modules/content/ui/public/EventRecordingSearch";

type EventsSearchParams = Promise<{
  recordingSearch?: string;
  category?: string;
  recordingPage?: string;
  eventType?: string;
  page?: string;
  search?: string;
}>;

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("events");
  return page ? contentMetadata(page) : {};
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: EventsSearchParams;
}) {
  const parameters = await searchParams;
  const eventType = eventTypeOptions.some(
    (option) => option.value === parameters.eventType,
  )
    ? parameters.eventType
    : undefined;
  const pageNumber = Math.max(
    1,
    Number.parseInt(parameters.page ?? "1", 10) || 1,
  );
  const query = {
    eventType,
    page: pageNumber,
    pageSize: 3,
    period: "upcoming" as const,
    search: parameters.search?.trim() ?? "",
  };
  const [result, page, recordings, categories] = await Promise.all([
    getEventContentPage(query),
    getPage("events"),
    getEventContentPage({
      period: "recordings",
      pageSize: 6,
      page: Math.max(
        1,
        Number.parseInt(parameters.recordingPage ?? "1", 10) || 1,
      ),
      search: parameters.recordingSearch?.trim() ?? "",
      category: parameters.category || undefined,
    }),
    getRecordingCategories(),
  ]);

  return (
    <>
      <section className="bg-brand-cream py-9 sm:py-12">
        <div className="container">
          <h1 className="text-4xl font-bold text-brand-navy sm:text-5xl">
            {page?.title || "Events & Programmes"}
          </h1>
          <p className="mt-2 text-lg text-brand-navy/70">
            {page?.summary ||
              "Learn, connect and prepare for your next opportunity."}
          </p>
        </div>
      </section>

      <main className="section bg-white">
        <div className="container">
          <div className="flex flex-col gap-5 border-b border-brand-navy/15 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <nav aria-label="Event sections" className="flex gap-8">
              <Link
                aria-current="page"
                className="border-b-2 border-brand-orange pb-3 font-bold text-brand-navy"
                href="/events"
              >
                Upcoming events
              </Link>
              <Link href="#recordings" className="pb-3 text-brand-navy/60">
                Past recordings
              </Link>
            </nav>
            <EventSearchControls
              eventType={query.eventType}
              search={query.search}
            />
          </div>

          <div className="mt-6 grid gap-6">
            {result.items.length ? (
              result.items.map((item) => (
                <EventFeature item={item} key={item.id} />
              ))
            ) : (
              <EmptyState
                title="No matching upcoming events"
                message="Try another search or event type. New published events will appear here."
              />
            )}
          </div>

          <EventPagination
            eventType={query.eventType}
            page={result.page}
            pageSize={query.pageSize}
            search={query.search}
            total={result.total}
          />
          <section
            className="mt-8 border-t border-brand-navy/15 pt-6"
            id="recordings"
            aria-labelledby="recordings-heading"
          >
            <div className="flex flex-col justify-between gap-5 lg:flex-row">
              <div>
                <h2
                  className="text-3xl font-bold text-brand-navy"
                  id="recordings-heading"
                >
                  Past webinars & recordings
                </h2>
                <p className="mt-2 text-brand-navy/70">
                  Catch up on our previous sessions and learn at your own pace.
                </p>
              </div>
              <EventRecordingSearch
                search={parameters.recordingSearch ?? ""}
                category={parameters.category ?? ""}
                categories={categories}
              />
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {recordings.items.map((item) => (
                <EventRecordingCard key={item.id} item={item} />
              ))}
            </div>
            {!recordings.items.length ? (
              <EmptyState
                title="No matching recordings"
                message="Published session recordings will appear here when available."
              />
            ) : null}
            {recordings.totalPages > 1 ? (
              <nav
                aria-label="Recording pagination"
                className="mt-5 flex justify-between gap-4"
              >
                {recordings.page > 1 ? (
                  <Link
                    href={recordingPageHref(parameters, recordings.page - 1)}
                  >
                    Previous recordings
                  </Link>
                ) : (
                  <span />
                )}
                <span>
                  Page {recordings.page} of {recordings.totalPages}
                </span>
                {recordings.page < recordings.totalPages ? (
                  <Link
                    href={recordingPageHref(parameters, recordings.page + 1)}
                  >
                    Next recordings
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            ) : null}
          </section>
        </div>
      </main>
    </>
  );
}

function recordingPageHref(
  parameters: Awaited<EventsSearchParams>,
  page: number,
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters)) {
    if (value && key !== "recordingPage") query.set(key, value);
  }
  query.set("recordingPage", String(page));
  return `/events?${query}#recordings`;
}
