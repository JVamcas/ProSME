"use client";

import { useRouter } from "next/navigation";

import { FundingOpportunityCard } from "@/components/applicant/funding-opportunities/FundingOpportunityCard";
import { PortalErrorState } from "@/components/layout/PortalErrorState";
import { PortalLoadingState } from "@/components/layout/PortalLoadingState";
import { GeneralButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { useCreateApplication } from "@/modules/applications/ApplicationHooks";
import type { FundingOpportunitySummary } from "@/modules/funding-calls/FundingOpportunityTypes";
import { ApplicationOpportunitySearch } from "./ApplicationOpportunitySearch";
import {
  opportunityChooserPageSize,
  useApplicationOpportunityChooser,
} from "./useApplicationOpportunityChooser";

function OpportunityResults({ items }: { items: FundingOpportunitySummary[] }) {
  const router = useRouter();
  const creation = useCreateApplication();

  async function apply(opportunityId: string) {
    const application = await creation.mutateAsync(opportunityId);
    router.push(`/portal/applications/${application.id}/edit`);
  }

  return (
    <div className="mt-5 grid gap-4">
      {items.map((opportunity) => {
        const applying =
          creation.isPending && creation.variables === opportunity.id;
        return (
          <FundingOpportunityCard
            action={
              <GeneralButton
                className="w-full sm:w-auto"
                disabled={creation.isPending}
                onClick={() => void apply(opportunity.id)}
                type="button"
              >
                {applying ? "Starting…" : "Apply"}
              </GeneralButton>
            }
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

export function NewApplicationChooser() {
  const browser = useApplicationOpportunityChooser();

  if (browser.query.isPending) {
    return (
      <PortalLoadingState
        title="Loading opportunities"
        description="Open funding calls are being prepared."
      />
    );
  }
  if (browser.query.isError) {
    return (
      <PortalErrorState
        title="Opportunities could not be loaded"
        description={browser.query.error.message}
        onAction={() => void browser.query.refetch()}
      />
    );
  }

  const items = browser.query.data.items;
  return (
    <section className="mt-6">
      <ApplicationOpportunitySearch onChange={browser.setSearch} />
      {items.length ? (
        <OpportunityResults items={items} />
      ) : (
        <div className="mt-5">
          <EmptyState
            title="No open opportunities found"
            message="Try a different search or return when another funding call opens."
          />
        </div>
      )}
      <Pagination
        hasNextPage={Boolean(browser.query.data.nextCursor)}
        onNext={browser.nextPage}
        onPrevious={browser.previousPage}
        page={browser.pageIndex + 1}
        pageSize={opportunityChooserPageSize}
        total={browser.query.data.total}
      />
    </section>
  );
}
