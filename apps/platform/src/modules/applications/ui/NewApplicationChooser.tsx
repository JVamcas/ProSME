"use client";

import { useRouter } from "next/navigation";

import { FundingOpportunityCard } from "@/modules/funding-calls/ui/applicant/FundingOpportunityCard";
import { PortalErrorState } from "@/shared/ui/portal/PortalErrorState";
import { PortalLoadingState } from "@/shared/ui/portal/PortalLoadingState";
import { GeneralButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import type { PublicFundingCallSummary } from "@/modules/funding-calls/api/PublicFundingCallTransport";
import { useCreateApplication } from "./useApplications";
import { ApplicationOpportunitySearch } from "./ApplicationOpportunitySearch";
import {
  opportunityChooserPageSize,
  useApplicationOpportunityChooser,
} from "./useApplicationOpportunityChooser";

import { ApplicationBusinessSelection } from "./ApplicationBusinessSelection";
import { SelectedFundingCallApplication } from "./SelectedFundingCallApplication";

export function NewApplicationChooser({
  fundingOpportunityId,
}: {
  fundingOpportunityId?: string;
}) {
  return fundingOpportunityId ? (
    <SelectedFundingCallApplication fundingOpportunityId={fundingOpportunityId} />
  ) : (
    <OpportunityChooser />
  );
}

function OpportunityResults({
  businessId,
  items,
}: {
  businessId: string;
  items: PublicFundingCallSummary[];
}) {
  const router = useRouter();
  const creation = useCreateApplication();
  async function apply(fundingCallIdOrSlug: string) {
    const application = await creation.mutateAsync({
      businessId,
      fundingCallIdOrSlug,
    });
    router.push(`/portal/applications/${application.id}/edit`);
  }
  return (
    <div className="mt-5 grid gap-4">
      {items.map((opportunity) => {
        const applying = creation.isPending
          && creation.variables?.fundingCallIdOrSlug === opportunity.id;
        return (
          <FundingOpportunityCard
            action={(
              <GeneralButton
                className="w-full sm:w-auto"
                disabled={creation.isPending || !businessId}
                onClick={() => void apply(opportunity.id)}
                type="button"
              >
                {applying ? "Starting…" : "Apply"}
              </GeneralButton>
            )}
            key={opportunity.id}
            opportunity={opportunity}
          />
        );
      })}
      {creation.isError ? (
        <p className="text-sm font-semibold text-brand-navy" role="alert">
          {creation.error.message}
        </p>
      ) : null}
    </div>
  );
}

function OpportunityChooser() {
  const browser = useApplicationOpportunityChooser();
  if (browser.query.isPending) {
    return (
      <PortalLoadingState
        description="Open funding calls are being prepared."
        title="Loading opportunities"
      />
    );
  }
  if (browser.query.isError) {
    return (
      <PortalErrorState
        description={browser.query.error.message}
        onAction={() => void browser.query.refetch()}
        title="Opportunities could not be loaded"
      />
    );
  }
  const result = browser.query.data;
  const items = result.items;
  return (
    <section className="mt-6 space-y-5">
      <ApplicationBusinessSelection>
        {(businessId) => (
          <>
            <ApplicationOpportunitySearch onChange={browser.setSearch} />
            {items.length ? (
              <OpportunityResults businessId={businessId} items={items} />
            ) : (
              <EmptyState
                message="Try a different search or return when another funding call opens."
                title="No open opportunities found"
              />
            )}
            <Pagination
              hasNextPage={Boolean(result.nextCursor)}
              onNext={browser.nextPage}
              onPrevious={browser.previousPage}
              page={browser.pageIndex + 1}
              pageSize={opportunityChooserPageSize}
              total={result.total}
            />
          </>
        )}
      </ApplicationBusinessSelection>
    </section>
  );
}
