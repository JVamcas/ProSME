"use client";

import { useMemo } from "react";
import { EChart } from "@/shared/ui/EChart";
import type { WebsiteRegion } from "../../domain/WebsiteAnalyticsPanels";
import {
  namibiaChartMap,
  namibiaVisitorMapOption,
} from "./NamibiaVisitorMapData";

export function NamibiaVisitorMap({ regions }: { regions: WebsiteRegion[] }) {
  const option = useMemo(() => namibiaVisitorMapOption(regions), [regions]);
  return (
    <div className="relative min-w-0">
      <EChart
        option={option}
        height="clamp(320px, 60vw, 560px)"
        map={namibiaChartMap}
        label="Interactive map of Namibia’s 14 regions"
      />
      <a
        href="https://data.humdata.org/dataset/cod-ab-nam"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-0 left-2 text-[10px] text-brand-navy/70"
      >
        Namibia Statistics Agency / HDX · CC BY 3.0 IGO
      </a>
    </div>
  );
}
