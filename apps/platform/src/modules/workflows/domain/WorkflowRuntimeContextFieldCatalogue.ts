import type { ConditionFieldDefinition } from "@/modules/conditions/domain/ConditionConfiguration";

const runtimeFields = [
  { key: "application.id", label: "ID", type: "TEXT" },
  {
    key: "application.funding_opportunity_id",
    label: "funding opportunity ID",
    type: "NUMBER",
  },
  {
    key: "application.reference",
    label: "reference",
    type: "TEXT",
  },
  { key: "application.status", label: "status", type: "TEXT" },
  { key: "fundingCall.id", label: "ID", type: "TEXT" },
  { key: "fundingCall.title", label: "title", type: "TEXT" },
  { key: "fundingCall.status", label: "status", type: "TEXT" },
  {
    key: "fundingCall.minimum_amount",
    label: "minimum amount",
    type: "NUMBER",
  },
  {
    key: "fundingCall.maximum_amount",
    label: "maximum amount",
    type: "NUMBER",
  },
  {
    key: "fundingCall.total_funding_amount",
    label: "total funding amount",
    type: "NUMBER",
  },
  {
    key: "fundingCall.funding_instrument",
    label: "funding instrument",
    type: "TEXT",
  },
  {
    key: "fundingCall.thematic_area",
    label: "thematic area",
    type: "TEXT",
  },
  {
    key: "fundingCall.opens_at",
    label: "opening date",
    type: "DATE",
  },
  {
    key: "fundingCall.closes_at",
    label: "closing date",
    type: "DATE",
  },
  {
    key: "eligibility.outcome",
    label: "Authoritative screening outcome",
    type: "TEXT",
  },
  {
    key: "eligibility.eligible",
    label: "Authoritative screening passed",
    type: "BOOLEAN",
  },
  {
    key: "eligibility.manual_screening_required",
    label: "Manual screening required",
    type: "BOOLEAN",
  },
  {
    key: "eligibility.hard_failure_count",
    label: "hard failure count",
    type: "NUMBER",
  },
  {
    key: "eligibility.soft_failure_count",
    label: "soft failure count",
    type: "NUMBER",
  },
  {
    key: "eligibility.warning_count",
    label: "warning count",
    type: "NUMBER",
  },
  {
    key: "eligibility.evaluated_at",
    label: "evaluation date",
    type: "DATE",
  },
  {
    key: "eligibility.rule_set_version_id",
    label: "Ruleset Version ID",
    type: "TEXT",
  },
  {
    key: "eligibility.rule_set_version_number",
    label: "Ruleset version number",
    type: "NUMBER",
  },
  { key: "workflow.id", label: "ID", type: "TEXT" },
  { key: "workflow.code", label: "code", type: "TEXT" },
  { key: "workflow.name", label: "name", type: "TEXT" },
  { key: "workflow.status", label: "status", type: "TEXT" },
  {
    key: "workflow.version_id",
    label: "version ID",
    type: "TEXT",
  },
  {
    key: "workflow.version_number",
    label: "version number",
    type: "NUMBER",
  },
  {
    key: "workflow.started_at",
    label: "start date",
    type: "DATE",
  },
  { key: "stage.id", label: "instance ID", type: "TEXT" },
  { key: "stage.definition_id", label: "definition ID", type: "TEXT" },
  { key: "stage.key", label: "key", type: "TEXT" },
  { key: "stage.name", label: "name", type: "TEXT" },
  { key: "stage.status", label: "status", type: "TEXT" },
  { key: "stage.started_at", label: "start date", type: "DATE" },
  { key: "task.id", label: "instance ID", type: "TEXT" },
  { key: "task.definition_id", label: "definition ID", type: "TEXT" },
  { key: "task.key", label: "key", type: "TEXT" },
  { key: "task.name", label: "name", type: "TEXT" },
  { key: "task.status", label: "status", type: "TEXT" },
  { key: "task.row_version", label: "row version", type: "NUMBER" },
] as const satisfies readonly ConditionFieldDefinition[];

const runtimeSourceLabels: Record<string, string> = {
  application: "Application",
  eligibility: "Eligibility",
  fundingCall: "Funding Call",
  workflow: "Workflow",
  stage: "Stage",
  task: "Task",
};

export const workflowRuntimeContextFields: readonly ConditionFieldDefinition[] =
  runtimeFields.map((field) => ({
    ...field,
    source: [{ label: runtimeSourceLabels[field.key.split(".")[0]] }],
  }));
