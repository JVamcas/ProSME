import { permanentRedirect } from "next/navigation";

import { publicFundingHref } from "@/modules/funding-calls/ui/public/PublicFundingCallLinks";

export default function FundingPage() {
  permanentRedirect(publicFundingHref);
}
