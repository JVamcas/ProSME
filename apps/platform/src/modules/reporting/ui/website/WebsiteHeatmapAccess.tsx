import { MousePointer2 } from "lucide-react";
import { GeneralButtonLink } from "@/components/ui/button";
import type { WebsiteAnalyticsMetrics } from "../../domain/WebsiteAnalyticsMetrics";

export function WebsiteHeatmapAccess({
  data,
}: {
  data: WebsiteAnalyticsMetrics["heatmap"];
}) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-brand-blue/25 bg-brand-white p-5">
      <div>
        <h2 className="flex items-center gap-3 text-lg font-bold">
          <MousePointer2 aria-hidden className="size-6 text-brand-orange" />
          Heatmaps & click tracking
        </h2>
        <p className="mt-2 text-sm">
          {data.provider} · {data.note}
        </p>
      </div>
      {data.accessUrl ? (
        <GeneralButtonLink
          href={data.accessUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
        >
          Open Clarity heatmaps
          <span className="sr-only"> (opens in a new tab)</span>
        </GeneralButtonLink>
      ) : (
        <p role="status" className="text-sm">
          Clarity project is not configured.
        </p>
      )}
    </section>
  );
}
