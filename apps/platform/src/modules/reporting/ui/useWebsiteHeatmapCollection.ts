"use client";

import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { clientWebsiteHeatmapService } from "../ClientWebsiteHeatmapService";
import { clientWebsiteHeatmapCaptureService } from "../ClientWebsiteHeatmapCaptureService";
import type { HeatmapBatch } from "../domain/WebsiteHeatmap";

export function useWebsiteHeatmapCollection(
  enabled: boolean,
  consent: boolean,
  pathname: string,
) {
  const { mutateAsync } = useMutation({
    mutationKey: ["reporting", "heatmap", "collect"],
    mutationFn: ({ batch, final }: { batch: HeatmapBatch; final: boolean }) =>
      clientWebsiteHeatmapService.collect(batch, final),
    retry: false,
    gcTime: 0,
  });
  useEffect(() => {
    clientWebsiteHeatmapCaptureService.start(enabled, consent, (batch, final) =>
      mutateAsync({ batch, final }),
    );
    return () => clientWebsiteHeatmapCaptureService.stop(true);
  }, [enabled, consent, pathname, mutateAsync]);
}
