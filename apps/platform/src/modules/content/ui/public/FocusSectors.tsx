import { Info, Sprout } from "lucide-react";

import type { EligibilityItem } from "../../ContentTypes";
import type { EligibilityFocusSection } from "../../EligibilityPageContent";

export function FocusSectors({
  content,
  items,
}: {
  content: EligibilityFocusSection;
  items: EligibilityItem[];
}) {
  const sectors = items.filter((item) => item.kind === "focusSector");
  if (!sectors.length) return null;
  return (
    <section
      aria-labelledby="focus-sectors-heading"
      className="container pb-12 pt-9 sm:pt-10"
    >
      <h2
        className="text-2xl font-bold text-brand-navy"
        id="focus-sectors-heading"
      >
        {content.eyebrow}
      </h2>
      <p className="mt-2 text-sm text-brand-navy/65">{content.heading}</p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {sectors.map((sector) => (
          <li
            className="flex items-center gap-3 rounded-lg border border-brand-blue/25 bg-white p-3"
            key={sector.label}
          >
            <Sprout aria-hidden className="size-5 shrink-0 text-brand-orange" />
            <span className="text-sm font-semibold text-brand-navy">
              {sector.label}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex items-start gap-3 rounded-lg bg-brand-navy p-4 text-white">
        <Info aria-hidden className="mt-1 size-5 shrink-0" />
        <p className="text-sm">
          <strong>{content.noticeHeading}</strong> {content.notice}
        </p>
      </div>
    </section>
  );
}
