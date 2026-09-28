import "server-only";

import { openScheduledFundingCalls } from "@/modules/funding-calls/application/ServerFundingCallLifecycleService";

export function publishScheduledCalls(now = new Date(), limit = 100) {
  return openScheduledFundingCalls(now, limit);
}
