"use client";

import { requestData, requestJson } from "@/lib/client-http";
import type {
  FundingOpportunityDetail,
  FundingOpportunityListInput,
  FundingOpportunityPage,
} from "./FundingOpportunityTypes";

const noStore = { cache: "no-store" as const };

type FundingOpportunityListEnvelope = {
  data: FundingOpportunityPage["items"];
  page: Omit<FundingOpportunityPage, "items">;
};

async function listFundingOpportunities(
  input: FundingOpportunityListInput,
): Promise<FundingOpportunityPage> {
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

function getFundingOpportunity(id: number) {
  return requestData<FundingOpportunityDetail>(
    `/api/portal/funding-opportunities/${id}`,
    noStore,
  );
}

export const clientFundingOpportunityService = {
  getFundingOpportunity,
  listFundingOpportunities,
};
