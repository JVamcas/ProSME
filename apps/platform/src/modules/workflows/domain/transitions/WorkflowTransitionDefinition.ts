import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";

export type WorkflowTransitionDefinition = {
  id?: string;
  sourceStageKey: string;
  actionKey: string;
  targetStageKey?: string | null;
  terminalOutcome?: string | null;
  priority: number;
  condition: ConditionGroup | null;
};
