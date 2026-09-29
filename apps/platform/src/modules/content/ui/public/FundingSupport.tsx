import { Check } from "lucide-react";

import type { FundingSupportContent } from "../../FundingPageContent";
import { FundingContentCards } from "./FundingContentCards";

export function FundingSupport({
  content,
}: {
  content: FundingSupportContent;
}) {
  return (
    <section
      aria-labelledby="funding-support-heading"
      className="bg-brand-cream/40 py-9 sm:py-10"
    >
      <div className="container">
        <h2
          className="text-2xl font-bold text-brand-navy"
          id="funding-support-heading"
        >
          {content.eyebrow}
        </h2>
        <p className="mt-2 font-semibold text-brand-navy/80">
          {content.heading}
        </p>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-brand-navy/65">
          {content.description}
        </p>
        <div className="mt-5">
          <FundingContentCards cards={content.cards} variant="support" />
        </div>
        <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-3 border-t border-brand-navy/10 pt-5">
          {content.uses.map((item) => (
            <li
              className="flex items-start gap-2 text-sm text-brand-navy/70"
              key={item}
            >
              <Check
                aria-hidden
                className="mt-1 size-4 shrink-0 text-brand-orange"
              />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
