import { permanentRedirect } from "next/navigation";

import { publicFundingCallHref } from "@/modules/funding-calls/ui/public/PublicFundingCallLinks";

export default async function FundingCallPage({
  params,
}: {
  params: Promise<{ fundingCallId: string }>;
}) {
  permanentRedirect(publicFundingCallHref((await params).fundingCallId));
}
