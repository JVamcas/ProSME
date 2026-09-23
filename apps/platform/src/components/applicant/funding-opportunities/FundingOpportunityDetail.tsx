import { Tabs, type TabItem } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import type { PublicFundingCallDetail as Opportunity } from "@/modules/funding-calls/api/PublicFundingCallTransport";
import { formatOpportunityDate } from "./FundingOpportunityFormat";
import {
  ContactPanel,
  DocumentsPanel,
  KeyInformationPanel,
  OverviewPanel,
} from "./FundingOpportunityDetailPanels";

type DetailTab = "overview" | "key" | "documents" | "contact";

const statusDateStyles: Record<Opportunity["status"], string> = {
  closed: "text-brand-orange",
  open: "text-brand-green",
  upcoming: "text-brand-gold",
};

function detailTabs(opportunity: Opportunity): TabItem<DetailTab>[] {
  return [
    {
      content: <OverviewPanel opportunity={opportunity} />,
      id: "overview",
      label: "Overview",
    },
    {
      content: <KeyInformationPanel opportunity={opportunity} />,
      id: "key",
      label: "Key information",
    },
    {
      content: <DocumentsPanel opportunity={opportunity} />,
      id: "documents",
      label: "Documents",
    },
    {
      content: <ContactPanel opportunity={opportunity} />,
      id: "contact",
      label: "Contact",
    },
  ];
}

export function FundingOpportunityStatus({
  opportunity,
}: {
  opportunity: Opportunity;
}) {
  const statusDateClassName = statusDateStyles[opportunity.status];
  return (
    <>
      <StatusBadge status={opportunity.status} />
      <span className={`text-sm font-semibold ${statusDateClassName}`}>
        {opportunity.status === "upcoming"
          ? "Opens"
          : opportunity.status === "closed"
            ? "Closed"
            : "Closes"}{" "}
        {formatOpportunityDate(
          opportunity.status === "upcoming"
            ? opportunity.opensAt
            : opportunity.closesAt,
        )}
      </span>
    </>
  );
}

export function FundingOpportunityDetail({
  opportunity,
}: {
  opportunity: Opportunity;
}) {
  return (
    <Tabs
      ariaLabel="Funding opportunity information"
      defaultSelectedId="overview"
      items={detailTabs(opportunity)}
    />
  );
}
