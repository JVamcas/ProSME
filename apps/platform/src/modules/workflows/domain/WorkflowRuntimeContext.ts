import type { ConditionFieldDefinition } from "@/modules/conditions/domain/ConditionConfiguration";
import type { WorkflowElementPermissions } from "./definitions/WorkflowElementPermissions";

export type WorkflowRuntimeContextRecord = Readonly<Record<string, unknown>>;

export type PriorStageRuntimeValues = {
  result: WorkflowRuntimeContextRecord;
  stageKey: string;
  values: WorkflowRuntimeContextRecord;
};

export type WorkflowTaskRuntimeContextSource = {
  application: {
    business: WorkflowRuntimeContextRecord;
    declarations: WorkflowRuntimeContextRecord;
    financial: WorkflowRuntimeContextRecord;
    fundingOpportunityId: string;
    id: string;
    project: WorkflowRuntimeContextRecord;
    reference: string | null;
    sectionCompletion: WorkflowRuntimeContextRecord;
    status: string;
  };
  binding: {
    contextFields: ConditionFieldDefinition[];
    formVersionId: string;
  };
  fundingCallTitle: string;
  eligibility: WorkflowRuntimeContextRecord;
  permissions: WorkflowElementPermissions;
  priorStageValues: PriorStageRuntimeValues[];
  stage: WorkflowRuntimeContextRecord;
  task: WorkflowRuntimeContextRecord;
  workflow: WorkflowRuntimeContextRecord;
};
