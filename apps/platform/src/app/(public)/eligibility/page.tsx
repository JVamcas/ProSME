import { permanentRedirect } from "next/navigation";

import { publicEligibilityHref } from "@/modules/funding-calls/ui/public/PublicFundingCallLinks";

export default async function EligibilityPage({
  searchParams,
}: {
  searchParams: Promise<{ fundingCall?: string }>;
}) {
  const fundingCallId = (await searchParams).fundingCall;
  permanentRedirect(
    fundingCallId
      ? publicEligibilityHref(fundingCallId)
      : "/how-to-apply/eligibility",
  );
}
