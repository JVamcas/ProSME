import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GeneralButtonLink } from "@/components/ui/button";
import { ApplicantJourney } from "@/modules/content/ui/public/ApplicantJourney";
import { HowToApplyNavigation } from "@/modules/content/ui/public/HowToApplyNavigation";
import { EligibilityAdvisoryNote } from "@/modules/eligibility/ui/self-check/EligibilityAdvisoryNote";
import { EligibilityCallContext } from "@/modules/eligibility/ui/self-check/EligibilityCallContext";
import { PublicEligibilitySelfCheck } from "@/modules/eligibility/ui/self-check/PublicEligibilitySelfCheck";
import { findPublicFundingCallById } from "@/modules/funding-calls/application/ServerPublicFundingCallService";
import {
  publicFundingCallHref,
  publicFundingHref,
} from "@/modules/funding-calls/ui/public/PublicFundingCallLinks";
import { Breadcrumbs } from "@/shared/ui/navigation/Breadcrumbs";

type Props = { params: Promise<{ fundingCallId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const call = await findPublicFundingCallById((await params).fundingCallId);
  return {
    title: call ? `Check eligibility — ${call.title}` : "Check eligibility",
  };
}

export default async function EligibilityPage({ params }: Props) {
  const call = await findPublicFundingCallById((await params).fundingCallId);
  if (!call) notFound();
  const available = call.selfCheckAvailable && call.status !== "closed";
  return (
    <>
      <HowToApplyNavigation active="eligibility" />
      <div className="container py-8 sm:py-10">
        <div className="mx-auto max-w-4xl">
          <Breadcrumbs
            items={[
              { href: "/how-to-apply", label: "How to Apply" },
              { href: publicFundingCallHref(call.id), label: call.title },
              { label: "Eligibility" },
            ]}
          />
          <h1 className="display text-3xl font-bold text-brand-navy sm:text-5xl">
            Check eligibility
          </h1>
          <p className="mt-3 text-brand-navy/65">
            Answer a few quick questions to see if this call is a good fit for
            your business.
          </p>
          <ApplicantJourney step={2} />
          <EligibilityCallContext call={call} />
          {available ? (
            <PublicEligibilitySelfCheck
              applicationHref={`${publicFundingCallHref(call.id)}/apply`}
              backHref={publicFundingCallHref(call.id)}
              fundingCallId={call.id}
              key={call.id}
            />
          ) : (
            <section className="rounded-xl border border-brand-blue/25 p-6">
              <h2 className="text-xl font-bold text-brand-navy">
                Eligibility self-check unavailable
              </h2>
              <p className="mt-3 text-brand-navy/65">
                {call.status === "closed"
                  ? "Applications for this funding call have closed."
                  : "This funding call does not currently offer an eligibility self-check."}
              </p>
              <GeneralButtonLink
                className="mt-5 min-h-11 rounded-lg"
                href={publicFundingHref}
                variant="outline"
              >
                Explore other calls
              </GeneralButtonLink>
            </section>
          )}
          <EligibilityAdvisoryNote />
        </div>
      </div>
    </>
  );
}
