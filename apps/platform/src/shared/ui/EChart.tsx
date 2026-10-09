"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  init,
  registerMap,
  type EChartsCoreOption,
  type EChartsType,
} from "./EChartRuntime";

export type EChartMap = {
  name: string;
  geoJSON: Parameters<typeof registerMap>[1];
};

export function EChart({
  option,
  label,
  height = 360,
  map,
  className,
}: {
  option: EChartsCoreOption;
  label: string;
  height?: number | string;
  map?: EChartMap;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<EChartsType | null>(null);

  useEffect(() => {
    if (!container.current) return;
    if (map) registerMap(map.name, map.geoJSON);
    const chart = init(container.current, undefined, { renderer: "svg" });
    instance.current = chart;
    const resize = () => chart.resize();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(resize);
    observer?.observe(container.current);
    window.addEventListener("resize", resize);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", resize);
      chart.dispose();
      instance.current = null;
    };
  }, [map]);

  useEffect(() => {
    instance.current?.setOption(option, {
      // Responsive overrides are partial options. Replacement also applies to
      // those overrides, discarding series they omit or only adjust for layout.
      replaceMerge: option.media ? [] : ["series", "graphic", "visualMap"],
    });
  }, [option, map]);

  return (
    <div
      ref={container}
      role="img"
      aria-label={label}
      className={cn("w-full min-w-0", className)}
      style={{ height }}
    />
  );
}
