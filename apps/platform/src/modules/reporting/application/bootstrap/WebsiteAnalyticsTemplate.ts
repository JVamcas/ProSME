import type { ReportBootstrapTemplate } from "./ReportBootstrapContract";

export const websiteAnalyticsTemplate = {
  key: "website-analytics",
  name: "Website Analytics",
  description:
    "Website-wide exact-period metrics as ordered tabular rows, including section, dimension, metric, value, unit, source state and coverage.",
  definition: {
    datasetKey: "website-analytics",
    datasetVersion: 1,
    sql: `SELECT section, dimension, metric, numeric_value, unit, source_state,
  fetched_at, source_note, start_date, end_date, collection_start, timezone,
  subject_to_thresholding, sampled, data_loss_from_other_row, truncated
FROM app_reporting_dataset_website_metrics_v1
WHERE start_date = $1::date AND end_date = $2::date AND timezone = $3::text
UNION ALL
SELECT 'eligibility'::text AS section,
  funding_call_title || '/' || rule_set_version_id::text AS dimension,
  outcome AS metric, checks::numeric AS numeric_value, 'count'::text AS unit,
  'ready'::text AS source_state, NULL::timestamptz AS fetched_at,
  'Anonymous advisory checks; not lodged applications'::text AS source_note,
  $1::date AS start_date, $2::date AS end_date, NULL::date AS collection_start,
  $3::text AS timezone, false AS subject_to_thresholding, false AS sampled,
  false AS data_loss_from_other_row, false AS truncated
FROM app_reporting_dataset_website_eligibility_v1
ORDER BY section, dimension, metric`,
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
    ],
    columns: [
      {
        name: "section",
        type: "text",
      },
      {
        name: "dimension",
        type: "text",
      },
      {
        name: "metric",
        type: "text",
      },
      {
        name: "numeric_value",
        type: "numeric",
      },
      {
        name: "unit",
        type: "text",
      },
      {
        name: "source_state",
        type: "text",
      },
      {
        name: "fetched_at",
        type: "timestamptz",
      },
      {
        name: "source_note",
        type: "text",
      },
      {
        name: "start_date",
        type: "date",
      },
      {
        name: "end_date",
        type: "date",
      },
      {
        name: "collection_start",
        type: "date",
      },
      {
        name: "timezone",
        type: "text",
      },
      {
        name: "subject_to_thresholding",
        type: "boolean",
      },
      {
        name: "sampled",
        type: "boolean",
      },
      {
        name: "data_loss_from_other_row",
        type: "boolean",
      },
      {
        name: "truncated",
        type: "boolean",
      },
    ],
    formats: ["XLSX", "CSV"],
  },
} satisfies ReportBootstrapTemplate;
