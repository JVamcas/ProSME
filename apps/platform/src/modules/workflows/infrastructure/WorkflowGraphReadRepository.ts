import "server-only";

import { asc, eq } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { workflowGraphSelection as selection } from "./WorkflowGraphProjection";
import {
  stageTaskActionBindings,
  stageTaskDefinitions,
  stageTaskFormBindings,
  workflowActionDefinitions,
  workflowDefinitionVersions,
  workflowDefinitions,
  workflowStageDefinitions,
  workflowTransitionDefinitions,
} from "./workflow.schema";
import {
  workflowStageJoinPredecessors,
  workflowTransitionTargets,
} from "./workflow-parallel.schema";

export async function readWorkflowGraphRows(versionId: string) {
  const database = getDatabase();
  // Each query returns one row per entity or binding, scoped to one version.
  // Independent collections must never be joined to each other.
  const [
    headers,
    stages,
    actions,
    tasks,
    taskActions,
    transitions,
    targets,
    predecessors,
  ] = await Promise.all([
    database
      .select({ definition: selection.definition, version: selection.version })
      .from(workflowDefinitionVersions)
      .innerJoin(
        workflowDefinitions,
        eq(workflowDefinitions.id, workflowDefinitionVersions.definitionId),
      )
      .where(eq(workflowDefinitionVersions.id, versionId)),
    database
      .select(selection.stage)
      .from(workflowStageDefinitions)
      .where(eq(workflowStageDefinitions.versionId, versionId))
      .orderBy(
        asc(workflowStageDefinitions.sequence),
        asc(workflowStageDefinitions.id),
      ),
    database
      .select(selection.action)
      .from(workflowActionDefinitions)
      .innerJoin(
        workflowStageDefinitions,
        eq(workflowStageDefinitions.id, workflowActionDefinitions.stageId),
      )
      .where(eq(workflowStageDefinitions.versionId, versionId))
      .orderBy(
        asc(workflowActionDefinitions.displayOrder),
        asc(workflowActionDefinitions.id),
      ),
    database
      .select({ task: selection.task, formBinding: selection.formBinding })
      .from(stageTaskDefinitions)
      .innerJoin(
        workflowStageDefinitions,
        eq(workflowStageDefinitions.id, stageTaskDefinitions.stageId),
      )
      .leftJoin(
        stageTaskFormBindings,
        eq(stageTaskFormBindings.taskDefinitionId, stageTaskDefinitions.id),
      )
      .where(eq(workflowStageDefinitions.versionId, versionId))
      .orderBy(
        asc(stageTaskDefinitions.displayOrder),
        asc(stageTaskDefinitions.id),
      ),
    database
      .select(selection.taskAction)
      .from(stageTaskActionBindings)
      .innerJoin(
        workflowStageDefinitions,
        eq(workflowStageDefinitions.id, stageTaskActionBindings.stageId),
      )
      .where(eq(workflowStageDefinitions.versionId, versionId))
      .orderBy(asc(stageTaskActionBindings.actionKey)),
    database
      .select(selection.transition)
      .from(workflowTransitionDefinitions)
      .where(eq(workflowTransitionDefinitions.versionId, versionId))
      .orderBy(
        asc(workflowTransitionDefinitions.priority),
        asc(workflowTransitionDefinitions.id),
      ),
    database
      .select(selection.transitionTarget)
      .from(workflowTransitionTargets)
      .innerJoin(
        workflowTransitionDefinitions,
        eq(
          workflowTransitionDefinitions.id,
          workflowTransitionTargets.transitionId,
        ),
      )
      .where(eq(workflowTransitionDefinitions.versionId, versionId))
      .orderBy(asc(workflowTransitionTargets.targetStageId)),
    database
      .select(selection.joinPredecessor)
      .from(workflowStageJoinPredecessors)
      .innerJoin(
        workflowStageDefinitions,
        eq(workflowStageDefinitions.id, workflowStageJoinPredecessors.stageId),
      )
      .where(eq(workflowStageDefinitions.versionId, versionId))
      .orderBy(asc(workflowStageJoinPredecessors.predecessorStageId)),
  ]);
  return {
    header: headers[0],
    stages,
    actions,
    tasks,
    taskActions,
    transitions,
    targets,
    predecessors,
  };
}
