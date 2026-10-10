import "server-only";
import { requirePermission } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import { RequestValidationError } from "@/lib/resource-errors";
import { isSameOriginRequest } from "@/shared/utils/requestOrigin";
import {
  heatmapBatchSchema,
  heatmapQuerySchema,
  type HeatmapQuery,
} from "../api/WebsiteHeatmapSchemas";
import {
  storeWebsiteHeatmap,
  readWebsiteHeatmap,
} from "../infrastructure/WebsiteHeatmapRepository";
import { getWebsiteHeatmapConfiguration } from "../ServerWebsiteAnalyticsCollectionService";
import type {
  HeatmapBatch,
  WebsiteHeatmapReport,
} from "../domain/WebsiteHeatmap";

export async function collectWebsiteHeatmap(
  input: HeatmapBatch,
  headers: Headers,
  requestUrl: string,
) {
  if (!getWebsiteHeatmapConfiguration().collectionEnabled) {
    throw new RequestValidationError("Heatmap collection is disabled.");
  }
  if (!isSameOriginRequest(headers, requestUrl)) {
    throw new RequestValidationError(
      "Heatmap collection requires a same-origin request.",
    );
  }
  await storeWebsiteHeatmap(heatmapBatchSchema.parse(input));
}

export async function getWebsiteHeatmap(
  user: AuthenticatedUser | null,
  input: HeatmapQuery,
): Promise<WebsiteHeatmapReport> {
  requirePermission(user, permissionCodes.reportingWebsiteReadAll);
  const query = heatmapQuerySchema.parse(input);
  const configuration = getWebsiteHeatmapConfiguration();
  const report = await readWebsiteHeatmap(query, configuration.timezone);
  return {
    ...report,
    collectionEnabled: configuration.collectionEnabled,
    timezone: configuration.timezone,
  };
}
