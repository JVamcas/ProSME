import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";

export type FundingOpportunityStatus = "upcoming" | "open" | "closed";

export type FundingOpportunityListInput = {
  after?: string;
  limit: number;
  search?: string;
  status?: FundingOpportunityStatus;
};

export type FundingOpportunitySummary = {
  closesAt: string;
  id: number;
  maximumAmount?: number | null;
  minimumAmount?: number | null;
  opensAt: string;
  slug: string;
  status: FundingOpportunityStatus;
  summary: string;
  title: string;
};

export type FundingOpportunityDetail = FundingOpportunitySummary & {
  eligibility: SerializedEditorState;
};

export type FundingOpportunityPage = {
  items: FundingOpportunitySummary[];
  nextCursor: string | null;
  total: number;
};
