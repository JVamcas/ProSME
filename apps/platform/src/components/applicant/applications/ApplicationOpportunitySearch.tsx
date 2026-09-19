"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "lucide-react";
import { useEffect } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { FormInput } from "@/components/ui/form-fields";
import {
  fundingOpportunitySearchSchema,
  type FundingOpportunitySearchInput,
} from "@/modules/funding-calls/FundingOpportunitySchemas";

export function ApplicationOpportunitySearch({
  onChange,
}: {
  onChange: (value: string) => void;
}) {
  const form = useForm<FundingOpportunitySearchInput>({
    defaultValues: { search: "" },
    resolver: zodResolver(fundingOpportunitySearchSchema),
  });
  const search = useWatch({ control: form.control, name: "search" });

  useEffect(() => onChange(search), [onChange, search]);

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit((input) => onChange(input.search))}>
        <FormInput
          aria-label="Search open funding opportunities"
          label="Search opportunities"
          leadingContent={
            <Search
              aria-hidden="true"
              className="absolute left-4 top-3.5 size-5 text-brand-orange"
            />
          }
          name="search"
          placeholder="Search by title or description…"
        />
      </form>
    </FormProvider>
  );
}
