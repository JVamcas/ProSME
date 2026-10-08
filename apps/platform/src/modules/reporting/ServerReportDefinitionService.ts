import "server-only";

import { requirePermission } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import { listReportDatasets } from "./infrastructure/ReportDatasetRepository";

export async function getReportDatasets(user: AuthenticatedUser | null) {
  requirePermission(user, permissionCodes.reportingDatasetReadAll);
  return listReportDatasets();
}
