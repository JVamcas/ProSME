import "server-only";
import { desc } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { fundingCalls } from "@/modules/funding-calls/infrastructure/funding-call.schema";

export async function listReportingFundingCalls() {
  return getDatabase()
    .select({ id: fundingCalls.id, title: fundingCalls.title })
    .from(fundingCalls)
    .orderBy(desc(fundingCalls.opensAt))
    .limit(100);
}
