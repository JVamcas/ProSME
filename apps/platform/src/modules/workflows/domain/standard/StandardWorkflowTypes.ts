import type { WorkflowGraphInput } from "../definitions/WorkflowTypes";

export const standardWorkflowCode = "SME_FUND_STANDARD";

export const standardWorkflowRoleCodes = [
  "programme_officer",
  "sector_specialist",
  "financial_reviewer",
  "due_diligence_officer",
  "panel_moderator",
  "approval_panel_member",
  "committee_secretariat",
  "delegated_approver",
  "contracts_officer",
  "grant_me_officer",
] as const;

export type StandardWorkflowRoleCode =
  (typeof standardWorkflowRoleCodes)[number];

export const standardWorkflowFormCodes = [
  "TECHNICAL_REVIEW",
  "FINANCE_REVIEW",
  "DUE_DILIGENCE_RISK",
  "MODERATION",
  "COMMITTEE_REVIEW",
  "APPROVAL",
  "APPEAL_SUBMISSION",
  "APPEAL_REVIEW",
  "TRANCHE_CLAIM",
  "DISBURSEMENT_REVIEW",
  "MONITORING_REVIEW",
  "EVALUATION_CLOSE_OUT_REVIEW",
] as const;

export type StandardWorkflowFormCode =
  (typeof standardWorkflowFormCodes)[number];

export type StandardWorkflowDependencies = {
  formVersionIds: Partial<Record<StandardWorkflowFormCode, string>>;
  roleIds: Record<StandardWorkflowRoleCode, string>;
};

export type StandardWorkflowDraft = {
  code: typeof standardWorkflowCode;
  description: string;
  graph: WorkflowGraphInput;
  name: string;
};

