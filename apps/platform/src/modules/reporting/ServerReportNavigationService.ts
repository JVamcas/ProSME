import "server-only";
import { requireAnyPermission } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";

export function getReportingPagePermissions(
  user: AuthenticatedUser | null,
  page: "definitions" | "reports" | "template-create" | "report-create",
) {
  const allowed = {
    definitions: [
      permissionCodes.reportingDatasetReadAll,
      permissionCodes.reportingTemplateReadAll,
    ],
    reports: [permissionCodes.reportingReportReadAll],
    "template-create": [permissionCodes.reportingTemplateCreateAll],
    "report-create": [permissionCodes.reportingReportCreateAll],
  };
  const actor = requireAnyPermission(user, allowed[page]);
  return [...actor.capabilities];
}
