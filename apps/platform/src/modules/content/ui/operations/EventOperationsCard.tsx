import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";

import { formatLocalDateTime24 } from "@/lib/dateUtils";
import type { EventOperationsListItem } from "../../api/EventOperationsTypes";

export function EventOperationsCard({
  event,
}: {
  event: EventOperationsListItem;
}) {
  const cover =
    event.image?.sizes?.mobile ??
    event.image?.sizes?.thumbnail ??
    event.image;

  return (
    <Link
      href={`/admin/events/${event.id}`}
      className="group flex min-w-0 flex-col gap-5 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange sm:flex-row sm:items-center sm:gap-6"
    >
      <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:w-60 lg:w-72">
        {cover?.url ? (
          <Image
            src={cover.url}
            alt={event.image?.alt ?? ""}
            fill
            unoptimized
            className="object-cover"
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 240px, 288px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <CalendarDays className="size-10" aria-hidden="true" />
            <span className="sr-only">No event cover image</span>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 px-2 pb-2 sm:py-2">
        <h2 className="line-clamp-2 break-words text-xl font-bold text-brand-navy">
          {event.title}
        </h2>
        <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-slate-600">
          {event.summary}
        </p>
        <p className="mt-4 flex items-center gap-2 text-sm text-slate-600">
          <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
          <time dateTime={event.startsAt}>
            {formatLocalDateTime24(event.startsAt, "—", event.timezone)}
          </time>
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="flex min-w-0 items-center gap-2 text-sm text-slate-600">
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
            <span className="break-words">{event.location}</span>
          </p>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-brand-navy group-hover:underline">
            Manage event
            <ArrowRight className="size-4" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}
