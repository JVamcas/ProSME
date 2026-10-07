import { CalendarDays, Download, Newspaper } from "lucide-react";

import { ArrowLink } from "@/components/ui/links";
import type { ListingItem } from "../../ContentTypes";
import { CmsImage } from "./CmsImage";

type Props = {
  item: ListingItem;
  kind: "news" | "resource";
  headingAs?: "h2" | "h3";
};

export function ContentListingCard({ item, kind, headingAs: Heading = "h3" }: Props) {
  const isResource = kind === "resource";
  const Icon = isResource ? Download : Newspaper;
  const category = isResource ? item.category ?? "Resource" : "News";
  const href = isResource
    ? item.href ?? `/resources/${item.slug}`
    : `/news/${item.slug}`;

  return (
    <article className="funding-card flex min-h-72 flex-col overflow-hidden rounded-xl border border-brand-blue/20 bg-white">
      {item.image ? (
        <CmsImage
          className="aspect-video w-full object-cover object-top"
          image={item.image}
          sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 25vw"
        />
      ) : (
        <div className="grid aspect-video place-items-center bg-brand-cream text-brand-orange">
          <Icon aria-hidden="true" className="size-10" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
        <span className="grid size-11 place-items-center rounded-full bg-brand-cream text-brand-orange">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <p className="mt-5 text-xs font-extrabold uppercase tracking-wider text-brand-navy">
          {category}
        </p>
        <Heading className="mt-2 text-xl font-bold text-brand-navy">
          {item.title}
        </Heading>
        <p className="mt-3 text-sm leading-6 text-brand-navy">
          {item.summary}
        </p>
        {item.date ? (
          <p className="mt-4 flex items-center gap-2 text-xs text-brand-navy">
            <CalendarDays aria-hidden="true" className="size-4 text-brand-orange" />
            <time dateTime={item.date}>
              {new Intl.DateTimeFormat("en-NA", {
                dateStyle: "medium",
              }).format(new Date(item.date))}
            </time>
          </p>
        ) : null}
        <ArrowLink
          className="mt-auto pt-6"
          href={href}
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
}
