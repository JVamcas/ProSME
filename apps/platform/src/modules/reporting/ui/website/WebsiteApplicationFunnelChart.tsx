"use client";

import { EChart } from "@/shared/ui/EChart";
import type { WebsiteOrderedFunnel } from "../../domain/WebsiteAnalyticsMetrics";
import { applicationFunnelOption } from "./WebsiteApplicationFunnelOptions";

export function WebsiteApplicationFunnelChart({
  data,
}: {
  data: WebsiteOrderedFunnel;
}) {
  return (
    <EChart option={applicationFunnelOption(data)} label="Application funnel" />
  );
}
