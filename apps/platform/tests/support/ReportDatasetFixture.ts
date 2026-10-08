import type { ReportDataset } from "@/modules/reporting/domain/ReportDataset";

export const applicationReportDataset: ReportDataset = {
  key: "application-data",
  version: 1,
  name: "Application Data",
  definition: {
    scope: "all",
    sourcePermissions: ["funding.application.all.read"],
    relations: [
      {
        name: "app_reporting_dataset_applications_v1",
        grain: "one submitted application",
        columns: [
          { name: "application_id", type: "uuid", nullable: false },
          { name: "reference", type: "text", nullable: false },
          { name: "funding_call_id", type: "uuid", nullable: false },
          { name: "lifecycle_status", type: "text", nullable: false },
          { name: "requested_grant_amount", type: "numeric", nullable: true },
        ],
      },
    ],
    joins: [],
    functions: ["sum", "count", "avg", "min", "max", "round", "lower", "date_trunc", "timezone"],
    notes: [],
  },
};
