import type { FundingCall } from "@/modules/funding-calls/domain/FundingCall";
import { richTextToPlainText } from "@/shared/utils/RichText";
import type { FundingCallItem } from "./ContentTypes";

export function fundingCallContentItem(call: FundingCall): FundingCallItem {
  return {
    closesAt: call.closesAt.toISOString(),
    description: call.description,
    id: call.id,
    maximumAmount: Number(call.maximumGrantAmount),
    minimumAmount: Number(call.minimumGrantAmount),
    opensAt: call.opensAt.toISOString(),
    slug: call.slug,
    status:
      call.status === "SCHEDULED"
        ? "upcoming"
        : call.status === "OPEN"
          ? "open"
          : "closed",
    summary: richTextToPlainText(call.description),
    title: call.title,
  };
}
