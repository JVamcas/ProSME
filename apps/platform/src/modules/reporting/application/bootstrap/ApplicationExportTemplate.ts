import type { ReportBootstrapTemplate } from "./ReportBootstrapContract";

export const applicationExportTemplate = {
  key: "application-export",
  name: "Application Data Export",
  description:
    "One lodged application per row, including its reference, funding call, submission date, lifecycle status and submitted business, project and financial values.",
  definition: {
    datasetKey: "application-data",
    datasetVersion: 1,
    sql: `SELECT reference, funding_call_title, submitted_at, lifecycle_status,
  business_name, business_region, business_sector, project_title,
  requested_grant_amount, total_project_cost, applicant_cofunding_amount, form_version_id
FROM app_reporting_dataset_applications_v1
WHERE submitted_at >= timezone($3::text, $1::date::timestamp)
  AND submitted_at < timezone($3::text, ($2::date + 1)::timestamp)
  AND ($4::uuid IS NULL OR funding_call_id = $4::uuid)
  AND lifecycle_status = ANY($5::text[])
  AND ($6::uuid IS NULL OR form_version_id = $6::uuid)
ORDER BY submitted_at, reference`,
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
        name: "lifecycleStatuses",
        type: "text-array",
        binding: "value",
        nullable: false,
        defaultValue: ["submitted", "withdrawn"],
        position: 5,
      },
      {
        name: "formVersionId",
        type: "uuid",
        binding: "value",
        nullable: true,
        defaultValue: null,
        position: 6,
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
        name: "submitted_at",
        type: "timestamptz",
      },
      {
        name: "lifecycle_status",
        type: "text",
      },
      {
        name: "business_name",
        type: "text",
      },
      {
        name: "business_region",
        type: "text",
      },
      {
        name: "business_sector",
        type: "text",
      },
      {
        name: "project_title",
        type: "text",
      },
      {
        name: "requested_grant_amount",
        type: "numeric",
      },
      {
        name: "total_project_cost",
        type: "numeric",
      },
      {
        name: "applicant_cofunding_amount",
        type: "numeric",
      },
      {
        name: "form_version_id",
        type: "uuid",
      },
    ],
    formats: ["XLSX", "CSV"],
  },
} satisfies ReportBootstrapTemplate;
