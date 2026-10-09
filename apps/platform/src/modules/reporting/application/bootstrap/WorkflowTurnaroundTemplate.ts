import type { ReportBootstrapTemplate } from "./ReportBootstrapContract";

export const workflowTurnaroundTemplate = {
  key: "workflow-turnaround",
  name: "Workflow Turnaround",
  description:
    "Completed stage and completing-user summaries with completion counts and average, minimum, maximum and pause-adjusted elapsed time.",
  definition: {
    datasetKey: "workflow-operations",
    datasetVersion: 1,
    sql: `SELECT 'stage'::text AS level, funding_call_title, stage_code,
  NULL::uuid AS user_id, NULL::text AS user_name, count(*)::integer AS completed_count,
  avg(gross_elapsed_hours) AS average_elapsed_hours, min(gross_elapsed_hours) AS minimum_elapsed_hours,
  max(gross_elapsed_hours) AS maximum_elapsed_hours, avg(paused_hours) AS average_paused_hours,
  avg(active_elapsed_hours) AS average_active_hours
FROM app_reporting_dataset_workflow_stages_v1
WHERE stage_status = 'COMPLETED'
  AND completed_at >= timezone($3::text, $1::date::timestamp)
  AND completed_at < timezone($3::text, ($2::date + 1)::timestamp)
  AND ($4::uuid IS NULL OR funding_call_id = $4::uuid)
  AND ($5::text IS NULL OR stage_code = $5::text) AND $6::uuid IS NULL
GROUP BY funding_call_title, stage_code
UNION ALL
SELECT 'completing-user'::text AS level, funding_call_title, stage_code,
  completing_user_id AS user_id, completing_user_name AS user_name, count(*)::integer AS completed_count,
  avg(gross_elapsed_hours) AS average_elapsed_hours, min(gross_elapsed_hours) AS minimum_elapsed_hours,
  max(gross_elapsed_hours) AS maximum_elapsed_hours, avg(paused_hours) AS average_paused_hours,
  avg(active_elapsed_hours) AS average_active_hours
FROM app_reporting_dataset_workflow_tasks_v1
WHERE task_status = 'COMPLETED'
  AND completed_at >= timezone($3::text, $1::date::timestamp)
  AND completed_at < timezone($3::text, ($2::date + 1)::timestamp)
  AND ($4::uuid IS NULL OR funding_call_id = $4::uuid)
  AND ($5::text IS NULL OR stage_code = $5::text)
  AND ($6::uuid IS NULL OR completing_user_id = $6::uuid)
GROUP BY funding_call_title, stage_code, completing_user_id, completing_user_name
ORDER BY level, funding_call_title, stage_code, user_name`,
    parameters: [
      {
        name: "startDate",
        type: "date",
        binding: "value",
        nullable: false,
        position: 1,
      },
      {
        name: "endDate",
        type: "date",
        binding: "value",
        nullable: false,
        position: 2,
      },
      {
        name: "timezone",
        type: "timezone",
        binding: "source-timezone",
        nullable: false,
        position: 3,
      },
      {
        name: "fundingCallId",
        type: "uuid",
        binding: "value",
        nullable: true,
        defaultValue: null,
        position: 4,
      },
      {
        name: "stageCode",
        type: "text",
        binding: "value",
        nullable: true,
        defaultValue: null,
        position: 5,
      },
      {
        name: "userId",
        type: "uuid",
        binding: "value",
        nullable: true,
        defaultValue: null,
        position: 6,
      },
    ],
    columns: [
      {
        name: "level",
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
        name: "user_id",
        type: "uuid",
      },
      {
        name: "user_name",
        type: "text",
      },
      {
        name: "completed_count",
        type: "integer",
      },
      {
        name: "average_elapsed_hours",
        type: "numeric",
      },
      {
        name: "minimum_elapsed_hours",
        type: "numeric",
      },
      {
        name: "maximum_elapsed_hours",
        type: "numeric",
      },
      {
        name: "average_paused_hours",
        type: "numeric",
      },
      {
        name: "average_active_hours",
        type: "numeric",
      },
    ],
    formats: ["XLSX", "CSV"],
  },
} satisfies ReportBootstrapTemplate;
