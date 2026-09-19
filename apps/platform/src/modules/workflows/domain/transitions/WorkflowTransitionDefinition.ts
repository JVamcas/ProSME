export type WorkflowTransitionDefinition = {
  id?: string;
  sourceStageKey: string;
  actionKey: string;
  targetStageKey?: string | null;
  terminalOutcome?: string | null;
  priority: number;
};
