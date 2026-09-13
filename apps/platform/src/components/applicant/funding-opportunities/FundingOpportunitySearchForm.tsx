"use client";

import { Search } from "lucide-react";
import { FormProvider, type UseFormReturn } from "react-hook-form";

import { FormInput } from "@/components/ui/form-fields";
import type { FundingOpportunitySearchInput } from "@/modules/funding-opportunities/FundingOpportunitySchemas";

type FundingOpportunitySearchFormProps = {
  form: UseFormReturn<FundingOpportunitySearchInput>;
  onSearchChange: () => void;
};

export function FundingOpportunitySearchForm({
  form,
  onSearchChange,
}: FundingOpportunitySearchFormProps) {
  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(() => undefined)}
        role="search"
      >
        <FormInput
          id="funding-opportunity-search"
          label="Search funding opportunities"
          labelClassName="sr-only"
          leadingContent={
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 z-10 size-5 -translate-y-1/2 text-brand-orange"
            />
          }
          maxLength={100}
          name="search"
          placeholder="Search opportunities…"
          registrationOptions={{ onChange: onSearchChange }}
          type="search"
        />
      </form>
    </FormProvider>
  );
}
