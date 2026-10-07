"use client";

import { requestData } from "@/lib/client-http";
import type {
  HeatmapBatch,
  WebsiteHeatmapReport,
} from "./domain/WebsiteHeatmap";
import {
  heatmapQuerySchema,
  type HeatmapQuery,
} from "./api/WebsiteHeatmapSchemas";
import { clientWebsiteAnalyticsService } from "./ClientWebsiteAnalyticsService";
let uploading = false;

function collect(batch: HeatmapBatch, final: boolean) {
  if (clientWebsiteAnalyticsService.readConsent() !== "accepted")
    return Promise.resolve();
  const body = JSON.stringify(batch);
  const path = "/api/public/analytics/heatmap";
  if (final && typeof navigator.sendBeacon === "function") {
    const queued = navigator.sendBeacon(
      path,
      new Blob([body], { type: "application/json" }),
    );
    if (queued) return Promise.resolve();
  }
  if (uploading && !final)
    return Promise.reject(
      new Error("A heatmap upload is already in progress."),
    );
  uploading = true;
  return requestData(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: final,
    credentials: "same-origin",
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  })
    .then(() => undefined)
    .finally(() => {
      uploading = false;
    });
}

function report(query: HeatmapQuery, signal?: AbortSignal) {
  const input = heatmapQuerySchema.parse(query);
  const parameters = new URLSearchParams({
    startDate: input.startDate,
    endDate: input.endDate,
  });
  if (input.layoutId) parameters.set("layoutId", input.layoutId);
  if (input.fundingCallId) parameters.set("fundingCallId", input.fundingCallId);
  return requestData<WebsiteHeatmapReport>(
    `/api/reporting/website/heatmap?${parameters}`,
    { signal, cache: "no-store" },
  );
}

export const clientWebsiteHeatmapService = { collect, report };
