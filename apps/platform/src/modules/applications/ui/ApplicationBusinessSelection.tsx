"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, type ReactNode } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { PortalErrorState } from "@/shared/ui/portal/PortalErrorState";
import { PortalLoadingState } from "@/shared/ui/portal/PortalLoadingState";
import { GeneralButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormSelect } from "@/components/ui/form-fields";
import { useBusinesses } from "@/modules/businesses/BusinessHooks";
import { BusinessDialog } from "@/modules/businesses/ui/BusinessDialog";

const representedBusinessSchema = z.object({
  businessId: z.uuid("Select a business to represent."),
});
type RepresentedBusinessInput = z.infer<typeof representedBusinessSchema>;

export function ApplicationBusinessSelection({
  children,
  disabled = false,
  onSubmit,
}: {
  children: (businessId: string) => ReactNode;
  disabled?: boolean;
  onSubmit?: (input: RepresentedBusinessInput) => Promise<void>;
}) {
  const businesses = useBusinesses();
  const [businessDialogOpen, setBusinessDialogOpen] = useState(false);
  const form = useForm<RepresentedBusinessInput>({
    defaultValues: { businessId: "" },
    resolver: zodResolver(representedBusinessSchema),
  });
  const businessId = useWatch({ control: form.control, name: "businessId" });

  if (businesses.isPending) {
    return (
      <PortalLoadingState
        description="Your businesses are being prepared."
        title="Loading businesses"
      />
    );
  }
  if (businesses.isError) {
    return (
      <PortalErrorState
        description={businesses.error.message}
        onAction={() => void businesses.refetch()}
        title="Businesses could not be loaded"
      />
    );
  }
  if (!businesses.data.length) {
    return (
      <>
        <EmptyState
          action={(
            <GeneralButton
              onClick={() => setBusinessDialogOpen(true)}
              type="button"
            >
              Add a business
            </GeneralButton>
          )}
          message="Add the business you are authorised to represent before starting an application."
          title="No business profile found"
        />
        <BusinessDialog
          isOpen={businessDialogOpen}
          onClose={() => setBusinessDialogOpen(false)}
        />
      </>
    );
  }

  return (
    <FormProvider {...form}>
      <form
        className="space-y-5"
        onSubmit={form.handleSubmit(onSubmit ?? (() => undefined))}
      >
        <FormSelect
          disabled={disabled}
          items={businesses.data.map((business) => ({
            label: business.tradingName || business.legalName,
            value: business.id,
          }))}
          label="Business represented by this application"
          name="businessId"
          placeholder="Select a business"
          required
        />
        {onSubmit ? children(businessId) : null}
      </form>
      {onSubmit ? null : children(businessId)}
    </FormProvider>
  );
}
