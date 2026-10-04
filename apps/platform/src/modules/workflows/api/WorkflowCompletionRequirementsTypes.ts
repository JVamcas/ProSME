export type WorkflowRequirementState =
  "MET" | "PENDING" | "NOT_MET" | "UNAVAILABLE";

export type WorkflowCompletionRequirement = {
  id: string;
  label: string;
  state: WorkflowRequirementState;
  detail: string;
  taskDefinitionId?: string;
  combinator?: "AND" | "OR";
  children?: WorkflowCompletionRequirement[];
};

export type WorkflowCompletionRequirements = {
  requirements: WorkflowCompletionRequirement[];
  satisfied: boolean;
};
