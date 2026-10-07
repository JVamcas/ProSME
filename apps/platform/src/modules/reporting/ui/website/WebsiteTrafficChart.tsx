"use client";

import { useMemo } from "react";
import { EChart } from "@/shared/ui/EChart";
import type { WebsiteTrafficDay } from "../../domain/WebsiteAnalyticsPanels";
import { websiteTrafficOption } from "./WebsiteChartOptions";

export function WebsiteTrafficChart({
  data,
  startDate,
  endDate,
}: {
  data: WebsiteTrafficDay[];
  startDate: string;
  endDate: string;
}) {
  const option = useMemo(
    () => websiteTrafficOption(data, startDate, endDate),
    [data, startDate, endDate],
  );
  return <EChart option={option} label="Website traffic trend" />;
}
