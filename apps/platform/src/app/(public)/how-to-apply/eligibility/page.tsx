import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ApplicantJourney } from "@/modules/content/ui/public/ApplicantJourney";
import { HowToApplyNavigation } from "@/modules/content/ui/public/HowToApplyNavigation";
import { listPublicFundingCalls } from "@/modules/funding-calls/application/ServerPublicFundingCallService";
import { PublicFundingCallList } from "@/modules/funding-calls/ui/public/PublicFundingCallList";
import { publicEligibilityHref } from "@/modules/funding-calls/ui/public/PublicFundingCallLinks";
import { Breadcrumbs } from "@/shared/ui/navigation/Breadcrumbs";

export const metadata: Metadata = {
  title: "Choose a call to check eligibility",
};

export default async function EligibilityCallChooser({
  searchParams,
}: {
  searchParams: Promise<{ after?: string; fundingCall?: string }>;
}) {
  const params = await searchParams;
  if (params.fundingCall) redirect(publicEligibilityHref(params.fundingCall));
  const calls = await listPublicFundingCalls({
    after: params.after,
    limit: 20,
  });
  return (
    <>
      <HowToApplyNavigation active="eligibility" />
      <div className="container pt-8 sm:pt-10">
        <Breadcrumbs
          items={[
            { href: "/how-to-apply", label: "How to Apply" },
            { label: "Check eligibility" },
          ]}
        />
        <h1 className="display text-3xl font-bold text-brand-navy sm:text-5xl">
          Choose a call to check eligibility
        </h1>
        <p className="mt-3 text-brand-navy/65">
          Each funding call has its own requirements. Choose the call you are
          interested in before starting your check.
        </p>
        <ApplicantJourney step={1} />
      </div>
      <PublicFundingCallList calls={calls} />
    </>
  );
}
