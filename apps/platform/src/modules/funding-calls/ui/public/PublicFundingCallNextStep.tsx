import { ArrowRight } from "lucide-react";

import { GeneralButtonLink } from "@/components/ui/button";
import type { PublicFundingCallDetail } from "../../api/PublicFundingCallTransport";
import { PublicFundingCallFacts } from "./PublicFundingCallFacts";
import { publicEligibilityHref } from "./PublicFundingCallLinks";
import { PublicFundingCallStatus } from "./PublicFundingCallStatus";

export function PublicFundingCallNextStep({
  call,
}: {
  call: PublicFundingCallDetail;
}) {
  const available = call.selfCheckAvailable && call.status !== "closed";
  return (
    <aside className="h-fit rounded-xl border border-brand-blue/25 bg-brand-blue/5 p-5 sm:p-7">
      <PublicFundingCallStatus call={call} />
      <div className="mt-6">
        <PublicFundingCallFacts call={call} />
      </div>
      <h2 className="mt-7 text-xl font-bold text-brand-navy">Your next step</h2>
      <p className="mt-2 text-sm leading-6 text-brand-navy/65">
        {available
          ? "Answer a few questions to check your eligibility for this funding call."
          : "The eligibility self-check is not currently available for this call."}
      </p>
      {available ? (
        <GeneralButtonLink
          className="mt-5 min-h-12 w-full rounded-lg"
          href={publicEligibilityHref(call.id)}
        >
          Check eligibility for this call{" "}
          <ArrowRight aria-hidden className="size-4" />
        </GeneralButtonLink>
      ) : null}
      {call.publicDocuments.length ? (
        <section className="mt-7 border-t border-brand-blue/25 pt-5">
          <h2 className="font-bold text-brand-navy">Documents</h2>
          <ul className="mt-3 grid gap-2">
            {call.publicDocuments.map((document) => (
              <li key={document.url}>
                <a
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-navy underline"
                  href={document.url}
                >
                  {document.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {call.publicContact.email ? (
        <section className="mt-7 border-t border-brand-blue/25 pt-5">
          <h2 className="font-bold text-brand-navy">Need help?</h2>
          <a
            className="mt-2 inline-flex min-h-11 break-all text-sm font-semibold text-brand-navy underline"
            href={`mailto:${call.publicContact.email}`}
          >
            {call.publicContact.name ?? call.publicContact.email}
          </a>
        </section>
      ) : null}
    </aside>
  );
}
