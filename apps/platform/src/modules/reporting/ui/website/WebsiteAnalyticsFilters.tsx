"use client";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GeneralButton } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-fields";
import { QueryRefreshButton } from "@/shared/ui/QueryRefreshButton";
import {
  websiteAnalyticsQuerySchema,
  type WebsiteAnalyticsQuery,
} from "../../api/WebsiteAnalyticsSchemas";
import { FormDateInput } from "@/shared/ui/FormDateInput";

const filterSchema = websiteAnalyticsQuerySchema.safeExtend({
  fundingCallId: z.union([z.uuid(), z.literal("")]).optional(),
});
type Filters = z.infer<typeof filterSchema>;

export function WebsiteAnalyticsFilters({
  calls,
  initialQuery,
  refreshing,
  onChange,
  onRefresh,
}: {
  calls: { id: string; title: string }[];
  initialQuery: WebsiteAnalyticsQuery;
  refreshing: boolean;
  onChange: (query: WebsiteAnalyticsQuery) => void;
  onRefresh: () => void;
}) {
  const form = useForm<Filters>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      ...initialQuery,
      fundingCallId: initialQuery.fundingCallId ?? "",
    },
  });
  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit((value) =>
          onChange({
            ...value,
            fundingCallId: value.fundingCallId || undefined,
          }),
        )}
        className="mb-5 grid min-w-0 items-end gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap xl:justify-end"
      >
        <FormDateInput
          label="From"
          name="startDate"
          required
          size="compact"
          containerClassName="min-w-0 xl:w-40"
        />
        <FormDateInput
          label="To"
          name="endDate"
          required
          size="compact"
          containerClassName="min-w-0 xl:w-40"
        />
        <FormSelect
          size="compact"
          label="Funding call"
          name="fundingCallId"
          containerClassName="min-w-0 sm:col-span-2 xl:w-64"
          items={[
            { value: "", label: "All funding calls" },
            ...calls.map((call) => ({ value: call.id, label: call.title })),
          ]}
        />
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2 xl:col-auto">
          <GeneralButton type="submit" variant="primary" size="compact">
            Apply filters
          </GeneralButton>
          <QueryRefreshButton refreshing={refreshing} onRefresh={onRefresh} />
        </div>
      </form>
    </FormProvider>
  );
}
