"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { FundingOpportunityCard } from "@/modules/funding-calls/ui/applicant/FundingOpportunityCard";
import { PortalErrorState } from "@/components/layout/PortalErrorState";
import { PortalLoadingState } from "@/components/layout/PortalLoadingState";
import { GeneralButton, GeneralButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormSelect } from "@/components/ui/form-fields";
import { Pagination } from "@/components/ui/pagination";
import { useBusinesses } from "@/modules/businesses/BusinessHooks";
import type { PublicFundingCallSummary } from "@/modules/funding-calls/api/PublicFundingCallTransport";
import { useCreateApplication } from "../ApplicationHooks";
import { ApplicationOpportunitySearch } from "./ApplicationOpportunitySearch";
import {
  opportunityChooserPageSize,
  useApplicationOpportunityChooser,
} from "./useApplicationOpportunityChooser";

const representedBusinessSchema = z.object({
  businessId: z.uuid("Select a business to represent."),
});
type RepresentedBusinessInput = z.infer<typeof representedBusinessSchema>;

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

export function NewApplicationChooser() {
  const browser = useApplicationOpportunityChooser();
  const businesses = useBusinesses();
  const form = useForm<RepresentedBusinessInput>({
    defaultValues: { businessId: "" },
    resolver: zodResolver(representedBusinessSchema),
  });
  const businessId = useWatch({ control: form.control, name: "businessId" });
  if (browser.query.isPending || businesses.isPending) {
    return (
      <PortalLoadingState
        description="Open funding calls and your businesses are being prepared."
        title="Loading opportunities"
      />
    );
  }
  if (browser.query.isError || businesses.isError) {
    return (
      <PortalErrorState
        description={browser.query.error?.message
          ?? businesses.error?.message
          ?? "Application options are unavailable."}
        onAction={() => {
          void browser.query.refetch();
          void businesses.refetch();
        }}
        title="Opportunities could not be loaded"
      />
    );
  }
  if (!businesses.data.length) {
    return (
      <EmptyState
        action={(
          <GeneralButtonLink href="/portal/businesses/new">
            Add a business
          </GeneralButtonLink>
        )}
        message="Add the business you are authorised to represent before starting an application."
        title="No business profile found"
      />
    );
  }
  const items = browser.query.data.items;
  return (
    <section className="mt-6 space-y-5">
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(() => undefined)}>
          <FormSelect
            items={businesses.data.map((business) => ({
              label: business.tradingName || business.legalName,
              value: business.id,
            }))}
            label="Business represented by this application"
            name="businessId"
            placeholder="Select a business"
            required
          />
        </form>
      </FormProvider>
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
