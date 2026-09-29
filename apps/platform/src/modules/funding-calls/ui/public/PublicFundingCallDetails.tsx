import { SanitizedRichTextContent } from "@/shared/ui/SanitizedRichTextContent";
import type { PublicFundingCallDetail } from "../../api/PublicFundingCallTransport";

export function PublicFundingCallDetails({
  call,
}: {
  call: PublicFundingCallDetail;
}) {
  return (
    <article className="rounded-xl border border-brand-blue/25 bg-white p-5 sm:p-8">
      <h2 className="text-2xl font-bold text-brand-navy">About this call</h2>
      <SanitizedRichTextContent
        className="mt-5"
        sanitizedHtml={call.description}
      />
      {call.eligibilitySummary ? (
        <section className="mt-8 border-t border-brand-blue/20 pt-6">
          <h2 className="text-xl font-bold text-brand-navy">
            Eligibility requirements
          </h2>
          <SanitizedRichTextContent
            className="mt-4"
            sanitizedHtml={call.eligibilitySummary}
          />
        </section>
      ) : null}
    </article>
  );
}
