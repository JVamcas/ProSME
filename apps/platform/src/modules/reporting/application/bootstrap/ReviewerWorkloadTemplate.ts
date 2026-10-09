import type { ReportBootstrapTemplate } from "./ReportBootstrapContract";

export const reviewerWorkloadTemplate = {
  key: "reviewer-workload",
  name: "Reviewer Workload",
  description:
    "Task totals by reviewer and funding call, including pending, in-progress, overdue, completed-in-period and unassigned work.",
  definition: {
    datasetKey: "workflow-operations",
    datasetVersion: 1,
    sql: `SELECT assigned_user_id AS reviewer_id, assigned_user_name AS reviewer_name,
  funding_call_id, funding_call_title,
  CASE WHEN assigned_user_id IS NULL THEN 'unassigned' ELSE 'assigned' END AS assignment_category,
  count(*) FILTER (WHERE task_status = 'PENDING')::integer AS pending,
  count(*) FILTER (WHERE task_status = 'IN_PROGRESS')::integer AS in_progress,
  count(*) FILTER (WHERE task_status IN ('PENDING', 'IN_PROGRESS') AND effective_due_at < run_at)::integer AS overdue,
  count(*) FILTER (WHERE task_status = 'COMPLETED'
    AND completed_at >= timezone($3::text, $1::date::timestamp)
    AND completed_at < timezone($3::text, ($2::date + 1)::timestamp))::integer AS completed_in_period
FROM app_reporting_dataset_workflow_tasks_v1
WHERE task_status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')
  AND ($4::uuid IS NULL OR funding_call_id = $4::uuid)
  AND ($5::uuid IS NULL OR assigned_user_id = $5::uuid)
GROUP BY assigned_user_id, assigned_user_name, funding_call_id, funding_call_title
ORDER BY funding_call_title, reviewer_name`,
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
        name: "reviewerId",
        type: "uuid",
        binding: "value",
        nullable: true,
        defaultValue: null,
        position: 5,
      },
    ],
    columns: [
      {
        name: "reviewer_id",
        type: "uuid",
      },
      {
        name: "reviewer_name",
        type: "text",
      },
      {
        name: "funding_call_id",
        type: "uuid",
      },
      {
        name: "funding_call_title",
        type: "text",
      },
      {
        name: "assignment_category",
        type: "text",
      },
      {
        name: "pending",
        type: "integer",
      },
      {
        name: "in_progress",
        type: "integer",
      },
      {
        name: "overdue",
        type: "integer",
      },
      {
        name: "completed_in_period",
        type: "integer",
      },
    ],
    formats: ["XLSX", "CSV"],
  },
} satisfies ReportBootstrapTemplate;
