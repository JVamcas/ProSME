import type { ReportBootstrapTemplate } from "./ReportBootstrapContract";

export const applicationPipelineTemplate = {
  key: "application-pipeline",
  name: "Application Pipeline by Stage",
  description:
    "Distinct active application counts by funding call and stage, including disclosure of overlap across parallel stages.",
  definition: {
    datasetKey: "workflow-operations",
    datasetVersion: 1,
    sql: `SELECT funding_call_id, funding_call_title, stage_code, stage_name,
  count(DISTINCT application_id)::integer AS active_applications,
  'Parallel stages can overlap; stage totals are not additive'::text AS coverage_note
FROM app_reporting_dataset_workflow_stages_v1
WHERE workflow_status = 'ACTIVE' AND stage_status IN ('ACTIVE', 'BLOCKED')
  AND ($1::uuid IS NULL OR funding_call_id = $1::uuid)
  AND ($2::text IS NULL OR stage_code = $2::text)
GROUP BY funding_call_id, funding_call_title, stage_code, stage_name
ORDER BY funding_call_title, stage_code`,
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
    ],
    columns: [
      {
        name: "funding_call_id",
        type: "uuid",
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
        name: "active_applications",
        type: "integer",
      },
      {
        name: "coverage_note",
        type: "text",
      },
    ],
    formats: ["XLSX", "CSV"],
  },
} satisfies ReportBootstrapTemplate;
