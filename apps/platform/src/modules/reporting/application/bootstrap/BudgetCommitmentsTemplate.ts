import type { ReportBootstrapTemplate } from "./ReportBootstrapContract";

export const budgetCommitmentsTemplate = {
  key: "budget-commitments",
  name: "Budget Commitments against Envelope",
  description:
    "Funding-call envelopes, effective committed amounts, remaining amounts, utilisation and amount-coverage diagnostics using the latest terminal-approved awards.",
  definition: {
    datasetKey: "workflow-operations",
    datasetVersion: 1,
    sql: `SELECT funding_call_id, funding_call_title, total_budget_envelope,
  effective_committed_amount, remaining_amount, utilisation_percent, approved_applications, missing_amounts
FROM app_reporting_dataset_call_commitments_v1
WHERE ($1::uuid IS NULL OR funding_call_id = $1::uuid)
ORDER BY funding_call_title, funding_call_id`,
    parameters: [
      {
        name: "fundingCallId",
        type: "uuid",
        binding: "value",
        nullable: true,
        defaultValue: null,
        position: 1,
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
        name: "total_budget_envelope",
        type: "numeric",
      },
      {
        name: "effective_committed_amount",
        type: "numeric",
      },
      {
        name: "remaining_amount",
        type: "numeric",
      },
      {
        name: "utilisation_percent",
        type: "numeric",
      },
      {
        name: "approved_applications",
        type: "integer",
      },
      {
        name: "missing_amounts",
        type: "integer",
      },
    ],
    formats: ["XLSX", "CSV"],
  },
} satisfies ReportBootstrapTemplate;
