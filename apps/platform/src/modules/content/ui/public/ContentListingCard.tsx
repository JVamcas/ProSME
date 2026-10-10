import { CalendarDays, Download, Newspaper } from "lucide-react";

import { ArrowLink } from "@/components/ui/links";
import type { ListingItem } from "../../ContentTypes";
import { CmsImage } from "./CmsImage";

type Props = {
  item: ListingItem;
  kind: "news" | "resource";
  headingAs?: "h2" | "h3";
};

export function ContentListingCard({
  item,
  kind,
  headingAs: Heading = "h3",
}: Props) {
  const isResource = kind === "resource";
  const Icon = isResource ? Download : Newspaper;
  const category = isResource ? item.category ?? "Resource" : "News";
  const href = isResource
    ? item.href ?? `/resources/${item.slug}`
    : `/news/${item.slug}`;

  return (
    <article className="funding-card flex min-h-72 min-w-0 flex-col overflow-hidden rounded-xl border border-brand-blue/20 bg-white">
      {item.image ? (
        <CmsImage
          className="h-44 w-full shrink-0 object-cover object-top"
          image={item.image}
          sizes="(max-width: 767px) 100vw, 50vw"
        />
      ) : (
        <div className="grid h-44 shrink-0 place-items-center bg-brand-cream text-brand-orange">
          <Icon aria-hidden="true" className="size-10" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
        <span className="grid size-11 place-items-center rounded-full bg-brand-cream text-brand-orange">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <p className="mt-5 line-clamp-1 break-words text-xs font-extrabold uppercase tracking-wider text-brand-navy">
          {category}
        </p>
        <Heading className="mt-2 line-clamp-2 break-words text-xl font-bold text-brand-navy">
          {item.title}
        </Heading>
        <p className="mt-3 line-clamp-3 break-words text-sm leading-6 text-brand-navy">
          {item.summary}
        </p>
      </div>
      <footer className="mt-auto flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-brand-blue/20 px-6 py-4">
        {item.date ? (
          <p className="flex items-center gap-2 whitespace-nowrap text-xs text-brand-navy">
            <CalendarDays
              aria-hidden="true"
              className="size-4 shrink-0 text-brand-orange"
            />
            <time dateTime={item.date}>
              {new Intl.DateTimeFormat("en-NA", {
                dateStyle: "medium",
              }).format(new Date(item.date))}
            </time>
          </p>
        ) : null}
        <ArrowLink
          href={href}
          rel={isResource ? "noopener noreferrer" : undefined}
          target={isResource ? "_blank" : undefined}
        >
          {isResource ? "Open resource" : "Read update"}
          {isResource ? (
            <span className="sr-only"> (opens in a new tab)</span>
          ) : null}
        </ArrowLink>
      </footer>
    </article>
  );
}
