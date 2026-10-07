"use client";

import { useMemo } from "react";
import { EChart } from "@/shared/ui/EChart";
import type { SelfCheckOutcome } from "../../domain/WebsiteAnalyticsCollection";
import { eligibilityChartOption } from "./WebsiteEligibilityChartOptions";

export function WebsiteEligibilityChart({
  data,
}: {
  data: { outcome: SelfCheckOutcome; checks: number }[];
}) {
  const option = useMemo(() => eligibilityChartOption(data), [data]);
  return (
    <EChart
      option={option}
      height={280}
      label="Eligibility self-check outcomes"
    />
  );
}
