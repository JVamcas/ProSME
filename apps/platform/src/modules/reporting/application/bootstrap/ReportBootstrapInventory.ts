import { websiteAnalyticsTemplate } from "./WebsiteAnalyticsTemplate";
import { applicationExportTemplate } from "./ApplicationExportTemplate";
import { applicationPipelineTemplate } from "./ApplicationPipelineTemplate";
import { applicationAgeingTemplate } from "./ApplicationAgeingTemplate";
import { workflowTurnaroundTemplate } from "./WorkflowTurnaroundTemplate";
import { reviewerWorkloadTemplate } from "./ReviewerWorkloadTemplate";
import { budgetCommitmentsTemplate } from "./BudgetCommitmentsTemplate";
import type { ReportBootstrapReport } from "./ReportBootstrapContract";

export const reportBootstrapTemplates = [
  websiteAnalyticsTemplate,
  applicationExportTemplate,
  applicationPipelineTemplate,
  applicationAgeingTemplate,
  workflowTurnaroundTemplate,
  reviewerWorkloadTemplate,
  budgetCommitmentsTemplate,
];

export const reportBootstrapReports: ReportBootstrapReport[] = [
  {
    key: "website-biweekly",
    description:
      "Website-wide analytics from collection start through yesterday, including source state and coverage, configured for bi-weekly reporting.",
    name: "Bi-weekly Website Analytics",
    templateKey: "website-analytics",
    defaults: { period: "website-completed", values: {} },
  },
  {
    key: "website-monthly",
    description:
      "Website-wide analytics from collection start through yesterday, including source state and coverage, configured for monthly reporting.",
    name: "Monthly Website Analytics",
    templateKey: "website-analytics",
    defaults: { period: "website-completed", values: {} },
  },
  {
    key: "application-data-export",
    description:
      "Submitted and withdrawn lodged applications from the previous complete month across permitted funding calls and compatible form versions.",
    name: "Application Data Export",
    templateKey: "application-export",
    defaults: { period: "previous-month", values: {} },
  },
  {
    key: "application-pipeline",
    description:
      "Current snapshot of distinct active applications by permitted funding call and workflow stage, including parallel-stage overlap.",
    name: "Application Pipeline by Stage",
    templateKey: "application-pipeline",
    defaults: { period: "explicit", values: {} },
  },
  {
    key: "application-ageing",
    description:
      "Current snapshot of active stage iterations across permitted calls and stages, showing gross and pause-adjusted age with a default minimum age of zero hours.",
    name: "Application Ageing",
    templateKey: "application-ageing",
    defaults: { period: "explicit", values: {} },
  },
  {
    key: "workflow-turnaround",
    description:
      "Stage and completing-user turnaround for work completed in the previous complete month across permitted calls, stages and users.",
    name: "Workflow Turnaround",
    templateKey: "workflow-turnaround",
    defaults: { period: "previous-month", values: {} },
  },
  {
    key: "reviewer-workload",
    description:
      "Current open tasks and completions in the previous complete month across permitted calls and reviewers, with unassigned work shown separately.",
    name: "Reviewer Workload",
    templateKey: "reviewer-workload",
    defaults: { period: "previous-month", values: {} },
  },
  {
    key: "budget-commitments",
    description:
      "Current funding-call budget commitments from the latest terminal-approved awards, excluding withdrawals, with remaining envelope and amount-coverage diagnostics.",
    name: "Budget Commitments against Envelope",
    templateKey: "budget-commitments",
    defaults: { period: "explicit", values: {} },
  },
];
