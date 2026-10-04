import "server-only";

import { getDatabase } from "@/db/client";
import { readStageCompletionTargets } from "./StageCompletionRepository";
import {
  loadRequiredTaskCompletionsForStages,
  loadStageCompletionValuesForStages,
} from "./StageCompletionReadRepository";
import { loadPriorStageContext } from "./StageActivationContextRepository";

export async function readWorkflowCompletionProgress(
  workflowInstanceId: string,
  stageInstanceIds: string[],
) {
  if (!stageInstanceIds.length) return null;
  const database = getDatabase();
  // Bounded batch reads: parallel stages do not add a query per stage.
  const [targets, requirements, values, priorStages] = await Promise.all([
    readStageCompletionTargets(stageInstanceIds),
    loadRequiredTaskCompletionsForStages(database, stageInstanceIds),
    loadStageCompletionValuesForStages(database, stageInstanceIds),
    loadPriorStageContext(database, workflowInstanceId),
  ]);
  return { targets, requirements, values, priorStages };
}
