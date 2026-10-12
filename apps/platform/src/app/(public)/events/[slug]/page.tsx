import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { contentMetadata } from "@/modules/content/ContentMetadata";
import { getEventBySlug } from "@/modules/content/application/ServerEventContentService";
import { CmsImage } from "@/modules/content/ui/public/CmsImage";
import { CmsRichText } from "@/modules/content/ui/public/CmsRichText";
import { EventRegistrationAction } from "@/modules/content/ui/public/EventRegistrationAction";
import { EventScheduleDetails } from "@/modules/content/ui/public/EventScheduleDetails";

type EventPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const item = await getEventBySlug((await params).slug);
  return item ? contentMetadata(item) : {};
}

export default async function EventDetailPage({ params }: EventPageProps) {
  const item = await getEventBySlug((await params).slug);
  if (!item?.body) notFound();

  return (
    <main>
      <section className="bg-brand-cream py-10 sm:py-14">
        <div className="container grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-brand-orange">
              {item.category || "Event"}
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-tight text-brand-navy sm:text-5xl">
              {item.title}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-brand-navy/70">
              {item.summary}
            </p>
            <EventScheduleDetails item={item} />
          </div>
          <CmsImage
            className="aspect-[1200/630] w-full rounded-xl object-cover"
            image={item.image}
            priority
          />
        </div>
      </section>
      <section className="section">
        <div className="container grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.75fr)] lg:items-start">
          <article className="cms-rich-text max-w-3xl">
            <CmsRichText data={item.body} />
          </article>
          <aside className="rounded-xl bg-brand-cream p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-brand-navy">
              Register for this session
            </h2>
            <p className="mt-2 text-sm leading-6 text-brand-navy/70">
              Secure your spot for {item.title}.
            </p>
            <div className="mt-5">
              <EventRegistrationAction
                eventId={item.id}
                eventTitle={item.title}
                registrationAvailable={item.registrationAvailable}
              />
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
