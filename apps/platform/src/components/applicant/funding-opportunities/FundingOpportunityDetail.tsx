"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { PortalErrorState } from "@/components/layout/PortalErrorState";
import { PortalLoadingState } from "@/components/layout/PortalLoadingState";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { useFundingOpportunity } from "@/modules/funding-calls/FundingOpportunityHooks";
import type { FundingOpportunityDetail as Opportunity } from "@/modules/funding-calls/FundingOpportunityTypes";
import { formatOpportunityDate } from "./FundingOpportunityFormat";
import {
  ContactPanel,
  DocumentsPanel,
  EligibilityPanel,
  KeyInformationPanel,
  OverviewPanel,
} from "./FundingOpportunityDetailPanels";

type DetailTab = "overview" | "eligibility" | "key" | "documents" | "contact";

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
      content: <EligibilityPanel opportunity={opportunity} />,
      id: "eligibility",
      label: "Eligibility",
    },
    {
      content: <KeyInformationPanel opportunity={opportunity} />,
      id: "key",
      label: "Key information",
    },
    {
      content: <DocumentsPanel />,
      id: "documents",
      label: "Documents",
    },
    {
      content: <ContactPanel />,
      id: "contact",
      label: "Contact",
    },
  ];
}

export function FundingOpportunityDetail({
  opportunityId,
}: {
  opportunityId: number;
}) {
  const query = useFundingOpportunity(opportunityId);

  if (query.isPending) {
    return (
      <PortalLoadingState
        description="The latest published information is being prepared."
        title="Loading funding opportunity"
      />
    );
  }

  if (query.isError) {
    return (
      <PortalErrorState
        description={query.error.message}
        onAction={() => void query.refetch()}
        title="Funding opportunity could not be loaded"
      />
    );
  }

  return <FundingOpportunityDetailView opportunity={query.data} />;
}

export function FundingOpportunityDetailView({
  opportunity,
}: {
  opportunity: Opportunity;
}) {
  const statusDateClassName = statusDateStyles[opportunity.status];
  return (
    <section>
      <Link
        className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-navy hover:underline"
        href="/portal/funding-opportunities"
      >
        <ChevronLeft aria-hidden="true" className="size-4 text-brand-orange" />
        Back to opportunities
      </Link>
      <header className="mt-2 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="display text-3xl font-bold text-brand-navy sm:text-4xl">
              {opportunity.title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-navy/70 sm:text-base">
              {opportunity.summary}
            </p>
          </div>
          <div className="flex items-center gap-3">
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
          </div>
        </div>
      </header>
      <Tabs
        ariaLabel="Funding opportunity information"
        defaultSelectedId="overview"
        items={detailTabs(opportunity)}
      />
    </section>
  );
}
