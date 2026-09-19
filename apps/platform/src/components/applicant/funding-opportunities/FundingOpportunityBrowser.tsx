"use client";

import { PortalErrorState } from "@/components/layout/PortalErrorState";
import { PortalLoadingState } from "@/components/layout/PortalLoadingState";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import type { FundingOpportunitySummary } from "@/modules/funding-calls/FundingOpportunityTypes";
import { FundingOpportunityCard } from "./FundingOpportunityCard";
import { FundingOpportunitySearchForm } from "./FundingOpportunitySearchForm";
import {
  fundingOpportunityPageSize,
  type FundingOpportunityFilter,
  useFundingOpportunityBrowser,
} from "./useFundingOpportunityBrowser";

const filters: TabItem<FundingOpportunityFilter>[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open now" },
  { id: "upcoming", label: "Upcoming" },
  { id: "closed", label: "Closed" },
];

function OpportunityList({
  hasActiveCriteria,
  opportunities,
}: {
  hasActiveCriteria: boolean;
  opportunities: FundingOpportunitySummary[];
}) {
  if (opportunities.length) {
    return (
      <div className="mt-5 grid gap-4">
        {opportunities.map((opportunity) => (
          <FundingOpportunityCard
            key={opportunity.id}
            opportunity={opportunity}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-5">
      <EmptyState
        message={
          hasActiveCriteria
            ? "Try a different search or status filter."
            : "Check back later for newly published funding calls."
        }
        title={
          hasActiveCriteria
            ? "No matching funding opportunities"
            : "No funding opportunities available"
        }
      />
    </div>
  );
}

export function FundingOpportunityBrowser({
  initialFilter = "all",
}: {
  initialFilter?: FundingOpportunityFilter;
}) {
  const browser = useFundingOpportunityBrowser(initialFilter);
  const { query } = browser;

  if (query.isPending) {
    return (
      <PortalLoadingState
        description="Published funding calls are being prepared."
        title="Loading funding opportunities"
      />
    );
  }

  if (query.isError) {
    return (
      <PortalErrorState
        description={query.error.message}
        onAction={() => void query.refetch()}
        title="Funding opportunities could not be loaded"
      />
    );
  }

  const selectedContent = (
    <>
      <FundingOpportunitySearchForm
        form={browser.searchForm}
        onSearchChange={browser.resetPagination}
      />
      <OpportunityList
        hasActiveCriteria={browser.hasActiveCriteria}
        opportunities={query.data?.items ?? []}
      />
      <Pagination
        disabled={query.isFetching}
        hasNextPage={Boolean(query.data?.nextCursor)}
        onNext={browser.nextPage}
        onPrevious={browser.previousPage}
        page={browser.pageIndex + 1}
        pageSize={fundingOpportunityPageSize}
        total={query.data?.total ?? 0}
      />
    </>
  );

  return (
    <div className="mt-6">
      <Tabs
        ariaLabel="Funding opportunity status"
        defaultSelectedId="all"
        items={filters}
        onSelectionChange={browser.selectFilter}
        selectedContent={selectedContent}
        selectedId={browser.filter}
      />
    </div>
  );
}
