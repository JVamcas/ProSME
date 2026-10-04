import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";

import type { TerminalApplicantStatus } from "./WorkflowTerminalOutcome";

export type WorkflowTransitionDefinition = {
  id?: string;
  sourceStageKey: string;
  actionKey: string;
  targetStageKeys: string[];
  terminalOutcome?: string | null;
  terminalApplicantStatus?: TerminalApplicantStatus | null;
  priority: number;
  condition: ConditionGroup | null;
};
