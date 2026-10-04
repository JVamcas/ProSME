"use client";

import { useRouter } from "next/navigation";

import { PortalErrorState } from "@/shared/ui/portal/PortalErrorState";
import { PortalLoadingState } from "@/shared/ui/portal/PortalLoadingState";
import { GeneralButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useFundingOpportunity } from "@/modules/funding-calls/FundingOpportunityHooks";
import { useCreateApplication } from "../ApplicationHooks";
import { ApplicationBusinessSelection } from "./ApplicationBusinessSelection";

export function SelectedFundingCallApplication({
  fundingOpportunityId,
}: {
  fundingOpportunityId: string;
}) {
  const opportunity = useFundingOpportunity(fundingOpportunityId);
  const creation = useCreateApplication();
  const router = useRouter();

  if (opportunity.isPending) {
    return (
      <PortalLoadingState
        description="Your selected funding call is being prepared."
        title="Loading funding call"
      />
    );
  }
  if (opportunity.isError) {
    return (
      <PortalErrorState
        description={opportunity.error.message}
        onAction={() => void opportunity.refetch()}
        title="Funding call could not be loaded"
      />
    );
  }

  const call = opportunity.data;
  if (!call.applicationsOpen) {
    return (
      <EmptyState
        message={`${call.title} is not currently accepting applications.`}
        title="Applications are unavailable"
      />
    );
  }

  async function startApplication({ businessId }: { businessId: string }) {
    try {
      const application = await creation.mutateAsync({
        businessId,
        fundingCallIdOrSlug: call.id,
      });
      router.push(`/portal/applications/${application.id}/edit`);
    } catch {
      // The mutation exposes the error below so the applicant can retry.
    }
  }

  return (
    <section className="mt-6 space-y-5">
      <div>
        <p className="text-sm text-brand-navy/70">Applying to</p>
        <h2 className="text-xl font-bold text-brand-navy">{call.title}</h2>
      </div>
      <ApplicationBusinessSelection
        disabled={creation.isPending}
        onSubmit={startApplication}
      >
        {(businessId) => (
          <>
            <GeneralButton
              disabled={creation.isPending || !businessId}
              type="submit"
            >
              {creation.isPending ? "Starting…" : "Start application"}
            </GeneralButton>
            {creation.isError ? (
              <p className="text-sm font-semibold text-brand-navy" role="alert">
                {creation.error.message}
              </p>
            ) : null}
          </>
        )}
      </ApplicationBusinessSelection>
    </section>
  );
}
