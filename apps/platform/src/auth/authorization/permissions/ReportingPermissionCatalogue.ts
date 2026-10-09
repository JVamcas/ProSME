import { permissionCodes } from "./PermissionCodes";

export const reportingPermissionCatalogue = [
  {
    code: permissionCodes.reportingScheduleUpdateAll,
    label: "Update schedules for all reports",
    description:
      "Configure report schedules. Execution owner and source access are checked separately.",
  },
  {
    code: permissionCodes.reportingDeliveryUpdateAll,
    label: "Update delivery for all reports",
    description:
      "Configure report event recipients. Report and source access are checked separately.",
  },
  {
    code: permissionCodes.reportingTemplateReadAll,
    label: "Read all report templates",
    description:
      "Read all report templates. Dataset and source access are checked separately for the target resource.",
  },
  {
    code: permissionCodes.reportingTemplateCreateAll,
    label: "Create report templates",
    description:
      "Create report templates. Dataset and source access are checked separately for the target resource.",
  },
  {
    code: permissionCodes.reportingTemplateUpdateAll,
    label: "Update all report template drafts",
    description:
      "Update all report template drafts. Dataset and source access are checked separately for the target resource.",
  },
  {
    code: permissionCodes.reportingTemplatePublishAll,
    label: "Publish immutable report template versions",
    description:
      "Publish immutable report template versions. Dataset and source access are checked separately for the target resource.",
  },
  {
    code: permissionCodes.reportingReportReadAll,
    label: "Read all configured reports",
    description:
      "Read all configured reports. Dataset and source access are checked separately for the target resource.",
  },
  {
    code: permissionCodes.reportingReportCreateAll,
    label: "Create configured reports",
    description:
      "Create configured reports. Dataset and source access are checked separately for the target resource.",
  },
  {
    code: permissionCodes.reportingReportUpdateAll,
    label: "Update all configured reports",
    description:
      "Update all configured reports. Dataset and source access are checked separately for the target resource.",
  },
  {
    code: permissionCodes.reportingReportRunAll,
    label: "Run all configured reports",
    description:
      "Run all configured reports. Dataset and source access are checked separately for the target resource.",
  },
  {
    code: permissionCodes.reportingRunReadAll,
    label: "Read all report runs",
    description:
      "Read all report runs. Dataset and source access are checked separately for the target resource.",
  },
  {
    code: permissionCodes.reportingRunDownloadAll,
    label: "Download all authorized report artifacts",
    description:
      "Download all authorized report artifacts. Dataset and source access are checked separately for the target resource.",
  },
] as const;
