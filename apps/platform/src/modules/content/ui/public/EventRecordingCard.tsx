import { Play, CalendarDays } from "lucide-react";
import { Badge } from "@/shared/ui/Badge";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import type { EventContentItem } from "../../infrastructure/EventContentProjection";
import { CmsImage } from "./CmsImage";

export function EventRecordingCard({ item }: { item: EventContentItem }) {
  return (
    <article className="grid gap-4 rounded-lg border border-brand-navy/15 p-3 sm:grid-cols-[180px_minmax(0,1fr)]">
      <a
        className="relative block min-h-36 overflow-hidden rounded-md bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-orange"
        href={item.recordingUrl!}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Play ${item.title} (opens in a new tab)`}
      >
        <CmsImage
          image={item.image}
          className="h-full w-full object-cover"
          sizes="180px"
        />
        <span className="absolute left-4 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/90">
          <Play className="size-5 text-brand-navy" aria-hidden="true" />
        </span>
      </a>
      <div className="min-w-0">
        <h3 className="text-lg font-bold text-brand-navy">{item.title}</h3>
        <Badge
          variant="outline"
          className="mt-2 border-0 bg-green-100 text-green-900"
        >
          {item.category || "Webinar recording"}
        </Badge>
        <p className="mt-3 flex items-center gap-2 text-xs text-brand-navy/70">
          <CalendarDays className="size-4" aria-hidden="true" />
          {formatLocalDateTime24(item.date, "—", item.timezone)}
        </p>
        <p className="mt-2 text-sm leading-5 text-brand-navy/70">
          {item.summary}
        </p>
        <a
          className="mt-3 inline-flex items-center gap-2 font-semibold text-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
          href={item.recordingUrl!}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Play className="size-4" aria-hidden="true" />
          Play recording
          <span className="sr-only">: {item.title} (opens in a new tab)</span>
        </a>
      </div>
    </article>
  );
}
