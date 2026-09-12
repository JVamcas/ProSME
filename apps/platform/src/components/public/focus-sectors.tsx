import { Sprout } from "lucide-react";

import type { EligibilityFocusSection } from "@/modules/content/eligibility-page-content";
import type { EligibilityItem } from "@/modules/content/content.types";

export function FocusSectors({ content, items }: { content: EligibilityFocusSection; items: EligibilityItem[] }) {
  const sectors = items.filter((item) => item.kind === "focusSector");
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {sectors.map((sector) => (
          <article
            key={sector.label}
            className="flex items-center gap-3 rounded-xl border border-brand-orange/20 bg-brand-white p-3"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-orange/10">
              <Sprout className="size-4 text-brand-orange" />
            </span>
            <h3 className="text-sm font-bold text-brand-navy">
              {sector.label}
            </h3>
          </article>
        ))}
      </div>
      <p className="mt-6 rounded-xl bg-brand-navy px-5 py-4 text-sm text-brand-white">
        <strong>{content.noticeHeading}</strong> {content.notice}
      </p>
    </>
  );
}
