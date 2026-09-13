import type { FundingOpportunitySummary } from "@/modules/funding-opportunities/FundingOpportunityTypes";

const dateFormatter = new Intl.DateTimeFormat("en-NA", {
  day: "2-digit",
  month: "short",
  timeZone: "Africa/Windhoek",
  year: "numeric",
});

const moneyFormatter = new Intl.NumberFormat("en-NA", {
  maximumFractionDigits: 0,
});

export function formatOpportunityDate(value: string) {
  return dateFormatter.format(new Date(value));
}

export function formatOpportunityAmount(
  opportunity: Pick<
    FundingOpportunitySummary,
    "maximumAmount" | "minimumAmount"
  >,
) {
  if (opportunity.maximumAmount != null) {
    return `Up to N$${moneyFormatter.format(opportunity.maximumAmount)}`;
  }

  if (opportunity.minimumAmount != null) {
    return `From N$${moneyFormatter.format(opportunity.minimumAmount)}`;
  }

  return "Amount to be confirmed";
}

export function opportunityDateLabel(
  opportunity: Pick<
    FundingOpportunitySummary,
    "closesAt" | "opensAt" | "status"
  >,
) {
  if (opportunity.status === "upcoming") {
    return `Opens ${formatOpportunityDate(opportunity.opensAt)}`;
  }

  if (opportunity.status === "closed") {
    return `Closed ${formatOpportunityDate(opportunity.closesAt)}`;
  }

  return `Closes ${formatOpportunityDate(opportunity.closesAt)}`;
}
