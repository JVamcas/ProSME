import "server-only";

import { closeExpiredFundingCalls } from "@/modules/funding-calls/application/ServerFundingCallLifecycleService";

export function closeExpiredFundingCallsJob(now = new Date(), limit = 100) {
  return closeExpiredFundingCalls(now, limit);
}
