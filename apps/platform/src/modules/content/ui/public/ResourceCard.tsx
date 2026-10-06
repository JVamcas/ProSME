import { Download } from "lucide-react";

import { ArrowLink } from "@/components/ui/links";
import type { ListingItem } from "../../ContentTypes";
import { CmsImage } from "./CmsImage";

export function ResourceCard({ item }: { item: ListingItem }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-brand-blue/25 bg-brand-white shadow-[0_12px_35px_rgba(10,24,59,0.08)]">
      <CmsImage
        className="aspect-video w-full object-cover object-top"
        image={item.image}
      />
      <div className="flex items-start gap-5 p-6">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-orange/10">
          <Download aria-hidden="true" className="size-5 text-brand-orange" />
        </span>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-brand-navy">
            {item.category}
          </p>
          <h2 className="mt-2 text-xl font-bold text-brand-navy">{item.title}</h2>
          <p className="mt-2 text-sm leading-6 text-brand-navy/75">{item.summary}</p>
          <ArrowLink href={`/resources/${item.slug}`} className="mt-4 underline">
            Open resource
          </ArrowLink>
        </div>
      </div>
    </article>
  );
}
