import { ArrowRight } from "lucide-react";

import { GeneralButtonLink } from "@/shared/ui/Button";
import type { EventContentItem } from "../../infrastructure/EventContentProjection";
import { CmsImage } from "./CmsImage";
import { EventRegistrationAction } from "./EventRegistrationAction";
import { EventScheduleDetails } from "./EventScheduleDetails";

export function EventFeature({ item }: { item: EventContentItem }) {
  return (
    <article className="overflow-hidden rounded-xl border border-brand-navy/15 bg-white lg:grid lg:grid-cols-[minmax(300px,0.95fr)_1fr]">
      <div className="min-h-72 bg-slate-100">
        <CmsImage
          className="h-full min-h-72 w-full object-cover"
          image={item.image}
          priority
          sizes="(max-width: 1024px) 100vw, 42vw"
        />
      </div>
      <div className="flex flex-col p-6 sm:p-8">
        <p className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs text-brand-navy">
          {item.category || "General"}
        </p>
        <h2 className="mt-4 text-3xl font-bold leading-tight text-brand-navy">
          {item.title}
        </h2>
        <EventScheduleDetails item={item} />
        <p className="mt-5 border-t border-brand-navy/15 pt-5 text-sm leading-6 text-brand-navy/75">
          {item.summary}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <GeneralButtonLink
            className="rounded-lg"
            href={`/events/${item.slug}`}
          >
            View event
            <ArrowRight className="size-4" aria-hidden="true" />
          </GeneralButtonLink>
          <EventRegistrationAction
            eventId={item.id}
            eventTitle={item.title}
            registrationAvailable={item.registrationAvailable}
          />
        </div>
      </div>
    </article>
  );
}
