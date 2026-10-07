"use client";

import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormSelect } from "@/components/ui/form-fields";
import { Skeleton } from "@/shared/ui/Skeleton";
import { QueryRefreshButton } from "@/shared/ui/QueryRefreshButton";
import { heatmapFilterSchema } from "../../api/WebsiteHeatmapSchemas";
import type { WebsiteAnalyticsQuery } from "../../api/WebsiteAnalyticsSchemas";
import { WebsiteAnalyticsPanelFrame } from "./WebsiteAnalyticsPanel";
import { WebsiteClickHeatmap } from "./WebsiteClickHeatmap";
import { WebsiteScrollDepthChart } from "./WebsiteScrollDepthChart";
import { useWebsiteHeatmap } from "./useWebsiteHeatmap";

const schema = heatmapFilterSchema.extend({
  mode: z.enum(["clicks", "scroll"]),
});
type Filters = z.infer<typeof schema>;

function pageLabel(page: string) {
  if (page === "/") return "Home";
  if (page.includes("/funding/")) return "Funding call details";
  return page
    .split("/")
    .filter(Boolean)
    .map((part) => part.replaceAll("-", " "))
    .join(" / ");
}

export function WebsiteHeatmapPanel({
  period,
}: {
  period: WebsiteAnalyticsQuery;
}) {
  const form = useForm<Filters>({
    resolver: zodResolver(schema),
    defaultValues: { layoutId: "", mode: "clicks" },
  });
  const [layoutId, mode] = useWatch({
    control: form.control,
    name: ["layoutId", "mode"],
  });
  const query = useWebsiteHeatmap({
    ...period,
    layoutId: layoutId || undefined,
  });
  const data = query.data;
  const totalClicks =
    data?.clicks.reduce((total, row) => total + row.count, 0) ?? 0;
  const details = (
    <div className="space-y-1">
      <p>
        Consenting approved public pages only. Forms and private pages are
        excluded.
      </p>
      <p>
        Each viewport size and captured layout is reported separately. Counts
        represent anonymous layout views, not unique visitors.
      </p>
      <p>
        Scroll depth measures the deepest visible part of the page, including
        the initial viewport.
      </p>
      <p>No text, images, form values or visitor identifiers are captured.</p>
      {data ? <p>Dates use {data.timezone}.</p> : null}
    </div>
  );
  return (
    <WebsiteAnalyticsPanelFrame
      title="Heatmaps & scroll depth"
      details={details}
    >
      {query.error ? (
        <p role="status" className="py-6 text-sm">
          Heatmap data could not be loaded.{" "}
          <QueryRefreshButton
            refreshing={query.isFetching}
            onRefresh={() => void query.refetch()}
          />
        </p>
      ) : null}
      {!data && !query.error ? (
        <Skeleton className="h-80 w-full" aria-label="Loading heatmap data" />
      ) : null}
      {data ? (
        <div className="space-y-4">
          {!data.collectionEnabled ? (
            <p role="status" className="text-sm">
              New heatmap collection is disabled. Saved results remain
              available.
            </p>
          ) : null}
          <FormProvider {...form}>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={form.handleSubmit(() => undefined)}
            >
              <FormSelect
                name="layoutId"
                label="Page and layout"
                size="compact"
                items={[
                  { value: "", label: "Most recent layout" },
                  ...data.variants.map((variant, index) => ({
                    value: variant.id,
                    label: `${pageLabel(variant.page)} · ${variant.viewportWidth}px · layout ${index + 1}`,
                  })),
                ]}
              />
              <FormSelect
                name="mode"
                label="View"
                size="compact"
                items={[
                  { value: "clicks", label: "Click hotspots" },
                  { value: "scroll", label: "Scroll depth" },
                ]}
              />
            </form>
          </FormProvider>
          {data.truncated ? (
            <p className="text-xs text-slate-500">
              Showing the 50 most recent layouts. Narrow the date range to see
              others.
            </p>
          ) : null}
          {data.selected ? (
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <p>
                  {data.selected.views.toLocaleString()} recorded views ·{" "}
                  {totalClicks.toLocaleString()} clicks
                </p>
                <QueryRefreshButton
                  refreshing={query.isFetching}
                  onRefresh={() => void query.refetch()}
                />
              </div>
              {mode === "scroll" ? (
                <WebsiteScrollDepthChart data={data.scroll} />
              ) : (
                <WebsiteClickHeatmap
                  layout={data.selected}
                  clicks={data.clicks}
                />
              )}
            </div>
          ) : (
            <p
              role="status"
              className="flex min-h-[280px] items-center justify-center text-sm text-brand-navy/70"
            >
              No recorded public-page views for this selection.
            </p>
          )}
        </div>
      ) : null}
    </WebsiteAnalyticsPanelFrame>
  );
}
