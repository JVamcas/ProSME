"use client";

import { requestData, requestJson } from "@/lib/client-http";
import type {
  PublicFundingCallDetail,
  PublicFundingCallListInput,
  PublicFundingCallPage,
} from "./api/PublicFundingCallTransport";

const noStore = { cache: "no-store" as const };

type FundingOpportunityListEnvelope = {
  data: PublicFundingCallPage["items"];
  page: Omit<PublicFundingCallPage, "items">;
};

async function listFundingOpportunities(
  input: PublicFundingCallListInput,
): Promise<PublicFundingCallPage> {
  const query = new URLSearchParams({ limit: String(input.limit) });

  if (input.after) query.set("after", input.after);
  if (input.search) query.set("search", input.search);
  if (input.status) query.set("status", input.status);

  const envelope = await requestJson<FundingOpportunityListEnvelope>(
    `/api/portal/funding-opportunities?${query.toString()}`,
    noStore,
  );

  return {
    items: envelope.data,
    ...envelope.page,
  };
}

function getFundingOpportunity(id: string) {
  return requestData<PublicFundingCallDetail>(
    `/api/portal/funding-opportunities/${id}`,
    noStore,
  );
}

export const clientFundingOpportunityService = {
  getFundingOpportunity,
  listFundingOpportunities,
};
