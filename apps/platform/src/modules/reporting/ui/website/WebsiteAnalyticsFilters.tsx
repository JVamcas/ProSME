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
        className="mb-5 flex flex-wrap justify-end items-end gap-3"
      >
        <FormDateInput
          label="From"
          name="startDate"
          required
          size="compact"
        />
        <FormDateInput
          label="To"
          name="endDate"
          required
          size="compact"
        />
        <FormSelect
          size="compact"
          label="Funding call"
          name="fundingCallId"
          items={[
            { value: "", label: "All funding calls" },
            ...calls.map((call) => ({ value: call.id, label: call.title })),
          ]}
        />
        <GeneralButton type="submit" variant="primary" size="compact">
          Apply filters
        </GeneralButton>
        <QueryRefreshButton refreshing={refreshing} onRefresh={onRefresh} />
      </form>
    </FormProvider>
  );
}
