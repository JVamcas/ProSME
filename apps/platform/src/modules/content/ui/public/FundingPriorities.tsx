import type { FundingPrioritiesContent } from "../../FundingPageContent";
import { FundingContentCards } from "./FundingContentCards";

export function FundingPriorities({
  content,
}: {
  content: FundingPrioritiesContent;
}) {
  return (
    <section
      aria-labelledby="funding-priorities-heading"
      className="container pt-9 sm:pt-10"
    >
      <h2
        className="text-2xl font-bold text-brand-navy"
        id="funding-priorities-heading"
      >
        {content.eyebrow}
      </h2>
      <p className="mt-2 text-sm text-brand-navy/65">{content.heading}</p>
      <div className="mt-5">
        <FundingContentCards cards={content.items} variant="priorities" />
      </div>
    </section>
  );
}
