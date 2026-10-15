"use client";

import { Search } from "lucide-react";
import { FormProvider, type UseFormReturn } from "react-hook-form";
import { FormInput } from "@/components/ui/form-fields";
import { DataTableFilter } from "@/components/ui/data-table-filter";
import type { FormListInput } from "../../api/FormTransportTypes";

export function FormsSearchForm({
  form,
  onClear,
  onSearch,
}: {
  form: UseFormReturn<Pick<FormListInput, "search">>;
  onClear: () => void;
  onSearch: (values: Pick<FormListInput, "search">) => void;
}) {
  return (
    <FormProvider {...form}>
      <form
        aria-label="Search forms"
        className="w-full"
        noValidate
        onSubmit={form.handleSubmit(onSearch)}
        role="search"
      >
        <DataTableFilter
          applyLabel="Search"
          clearLabel="Clear"
          defaultExpanded
          onApply={form.handleSubmit(onSearch)}
          onClear={onClear}
          title="Form filters"
        >
          <FormInput
            containerClassName="min-w-48 flex-1"
            label="Search forms"
            labelClassName="sr-only"
            leadingContent={
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-brand-orange"
              />
            }
            maxLength={200}
            name="search"
            placeholder="Search by name, code or description…"
            type="search"
          />
        </DataTableFilter>
      </form>
    </FormProvider>
  );
}
