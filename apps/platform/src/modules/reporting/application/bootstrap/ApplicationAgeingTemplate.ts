import type { ReportBootstrapTemplate } from "./ReportBootstrapContract";

export const applicationAgeingTemplate = {
  key: "application-ageing",
  name: "Application Ageing",
  description:
    "One active stage iteration per row, with application reference, funding call, stage, activation time, gross age, paused hours and active elapsed hours.",
  definition: {
    datasetKey: "workflow-operations",
    datasetVersion: 1,
    sql: `SELECT reference, funding_call_title, stage_code, stage_name, iteration_number,
  activated_at, run_at, gross_elapsed_hours, paused_hours, active_elapsed_hours
FROM app_reporting_dataset_workflow_stages_v1
WHERE workflow_status = 'ACTIVE' AND stage_status IN ('ACTIVE', 'BLOCKED')
  AND ($1::uuid IS NULL OR funding_call_id = $1::uuid)
  AND ($2::text IS NULL OR stage_code = $2::text)
  AND gross_elapsed_hours >= $3::integer
ORDER BY gross_elapsed_hours DESC, reference, stage_code, iteration_number`,
    parameters: [
      {
        name: "fundingCallId",
        type: "uuid",
        binding: "value",
        nullable: true,
        defaultValue: null,
        position: 1,
      },
      {
        name: "stageCode",
        type: "text",
        binding: "value",
        nullable: true,
        defaultValue: null,
        position: 2,
      },
      {
        name: "minimumAgeHours",
        type: "integer",
        binding: "value",
        nullable: false,
        defaultValue: 0,
        position: 3,
      },
    ],
    columns: [
      {
        name: "reference",
        type: "text",
      },
      {
        name: "funding_call_title",
        type: "text",
      },
      {
        name: "stage_code",
        type: "text",
      },
      {
        name: "stage_name",
        type: "text",
      },
      {
        name: "iteration_number",
        type: "integer",
      },
      {
        name: "activated_at",
        type: "timestamptz",
      },
      {
        name: "run_at",
        type: "timestamptz",
      },
      {
        name: "gross_elapsed_hours",
        type: "numeric",
      },
      {
        name: "paused_hours",
        type: "numeric",
      },
      {
        name: "active_elapsed_hours",
        type: "numeric",
      },
    ],
    formats: ["XLSX", "CSV"],
  },
} satisfies ReportBootstrapTemplate;
