import "server-only";
import { requirePermission } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import type { ReportTemplateDefinition } from "../domain/ReportDefinition";
import { findReportDataset } from "../infrastructure/ReportDatasetRepository";

export async function requireReportSourceAccess(
  user: AuthenticatedUser | null,
  definition: ReportTemplateDefinition,
) {
  const actor = requirePermission(
    user,
    permissionCodes.reportingDatasetReadAll,
  );
  const dataset = await findReportDataset(
    definition.datasetKey,
    definition.datasetVersion,
  );
  if (!dataset) {
    throw new ResourceNotFoundError("dataset version");
  }
  for (const permission of dataset.definition.sourcePermissions) {
    requirePermission(actor, permission);
  }
  return dataset;
}
