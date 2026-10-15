import "server-only";

import { asc, eq } from "drizzle-orm";

import { getDatabase, type DatabaseTransaction } from "@/db/client";
import {
  workflowStageChecklistDefinitions,
  workflowStageCommentFields,
  stageTaskDefinitions,
  workflowStageDefinitions,
  workflowStageDocumentRequirements,
  workflowStageScoringConfigurations,
  workflowStageScoringCriteria,
} from "@/db/schema";
import type { WorkflowStageInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";

function loadChecklistRows(
  versionId: string,
  database: Pick<DatabaseTransaction, "select"> = getDatabase(),
) {
  return database
    .select({
      id: workflowStageChecklistDefinitions.id,
      stageId: workflowStageChecklistDefinitions.stageId,
      taskStableKey: stageTaskDefinitions.stableKey,
      key: workflowStageChecklistDefinitions.key,
      text: workflowStageChecklistDefinitions.text,
      mandatory: workflowStageChecklistDefinitions.mandatory,
      responseType: workflowStageChecklistDefinitions.responseType,
      evidenceRequirement:
        workflowStageChecklistDefinitions.evidenceRequirement,
      notes: workflowStageChecklistDefinitions.notes,
      displayOrder: workflowStageChecklistDefinitions.displayOrder,
    })
    .from(workflowStageChecklistDefinitions)
    .innerJoin(
      workflowStageDefinitions,
      eq(
        workflowStageDefinitions.id,
        workflowStageChecklistDefinitions.stageId,
      ),
    )
    .innerJoin(
      stageTaskDefinitions,
      eq(
        stageTaskDefinitions.id,
        workflowStageChecklistDefinitions.taskDefinitionId,
      ),
    )
    .where(eq(workflowStageDefinitions.versionId, versionId))
    .orderBy(
      asc(workflowStageChecklistDefinitions.stageId),
      asc(workflowStageChecklistDefinitions.displayOrder),
    );
}

function loadCommentRows(
  versionId: string,
  database: Pick<DatabaseTransaction, "select"> = getDatabase(),
) {
  return database
    .select({
      id: workflowStageCommentFields.id,
      stageId: workflowStageCommentFields.stageId,
      taskStableKey: stageTaskDefinitions.stableKey,
      key: workflowStageCommentFields.key,
      label: workflowStageCommentFields.label,
      helpText: workflowStageCommentFields.helpText,
      mandatory: workflowStageCommentFields.mandatory,
      displayOrder: workflowStageCommentFields.displayOrder,
    })
    .from(workflowStageCommentFields)
    .innerJoin(
      workflowStageDefinitions,
      eq(workflowStageDefinitions.id, workflowStageCommentFields.stageId),
    )
    .innerJoin(
      stageTaskDefinitions,
      eq(stageTaskDefinitions.id, workflowStageCommentFields.taskDefinitionId),
    )
    .where(eq(workflowStageDefinitions.versionId, versionId))
    .orderBy(
      asc(workflowStageCommentFields.stageId),
      asc(workflowStageCommentFields.displayOrder),
    );
}

function loadDocumentRows(
  versionId: string,
  database: Pick<DatabaseTransaction, "select"> = getDatabase(),
) {
  return database
    .select({
      id: workflowStageDocumentRequirements.id,
      stageId: workflowStageDocumentRequirements.stageId,
      stableKey: workflowStageDocumentRequirements.stableKey,
      taskStableKey: stageTaskDefinitions.stableKey,
      name: workflowStageDocumentRequirements.name,
      mandatory: workflowStageDocumentRequirements.mandatory,
      acceptedFileTypes: workflowStageDocumentRequirements.acceptedFileTypes,
      maximumSizeMb: workflowStageDocumentRequirements.maximumSizeMb,
      maxPages: workflowStageDocumentRequirements.maxPages,
      acceptedExtensions: workflowStageDocumentRequirements.acceptedExtensions,
      expiryDays: workflowStageDocumentRequirements.expiryDays,
      requestOnStageActivation:
        workflowStageDocumentRequirements.requestOnStageActivation,
      uploader: workflowStageDocumentRequirements.uploader,
      verifier: workflowStageDocumentRequirements.verifier,
      templateReference: workflowStageDocumentRequirements.templateReference,
    })
    .from(workflowStageDocumentRequirements)
    .innerJoin(
      workflowStageDefinitions,
      eq(
        workflowStageDefinitions.id,
        workflowStageDocumentRequirements.stageId,
      ),
    )
    .innerJoin(
      stageTaskDefinitions,
      eq(
        stageTaskDefinitions.id,
        workflowStageDocumentRequirements.taskDefinitionId,
      ),
    )
    .where(eq(workflowStageDefinitions.versionId, versionId))
    .orderBy(
      asc(workflowStageDocumentRequirements.stageId),
      asc(workflowStageDocumentRequirements.name),
    );
}

function loadScoringConfigurations(
  versionId: string,
  database: Pick<DatabaseTransaction, "select"> = getDatabase(),
) {
  return database
    .select({
      stageId: workflowStageScoringConfigurations.stageId,
      taskDefinitionId: workflowStageScoringConfigurations.taskDefinitionId,
      aggregation: workflowStageScoringConfigurations.aggregation,
      taskStableKey: stageTaskDefinitions.stableKey,
    })
    .from(workflowStageScoringConfigurations)
    .innerJoin(
      workflowStageDefinitions,
      eq(
        workflowStageDefinitions.id,
        workflowStageScoringConfigurations.stageId,
      ),
    )
    .innerJoin(
      stageTaskDefinitions,
      eq(
        stageTaskDefinitions.id,
        workflowStageScoringConfigurations.taskDefinitionId,
      ),
    )
    .where(eq(workflowStageDefinitions.versionId, versionId))
    .orderBy(
      asc(workflowStageScoringConfigurations.stageId),
      asc(stageTaskDefinitions.displayOrder),
    );
}

function loadScoringCriteria(
  versionId: string,
  database: Pick<DatabaseTransaction, "select"> = getDatabase(),
) {
  return database
    .select({
      id: workflowStageScoringCriteria.id,
      stageId: workflowStageScoringCriteria.stageId,
      taskDefinitionId: workflowStageScoringCriteria.taskDefinitionId,
      stableKey: workflowStageScoringCriteria.stableKey,
      criterion: workflowStageScoringCriteria.criterion,
      description: workflowStageScoringCriteria.description,
      weight: workflowStageScoringCriteria.weight,
      scaleMinimum: workflowStageScoringCriteria.scaleMinimum,
      scaleMaximum: workflowStageScoringCriteria.scaleMaximum,
      mandatoryComment: workflowStageScoringCriteria.mandatoryComment,
    })
    .from(workflowStageScoringCriteria)
    .innerJoin(
      workflowStageDefinitions,
      eq(workflowStageDefinitions.id, workflowStageScoringCriteria.stageId),
    )
    .where(eq(workflowStageDefinitions.versionId, versionId))
    .orderBy(
      asc(workflowStageScoringCriteria.stageId),
      asc(workflowStageScoringCriteria.criterion),
    );
}

export async function loadWorkflowStageRequirements(
  versionId: string,
  database: Pick<DatabaseTransaction, "select"> = getDatabase(),
) {
  const [
    checklists,
    comments,
    documents,
    scoringConfigurations,
    scoringCriteria,
  ] = await Promise.all([
    loadChecklistRows(versionId, database),
    loadCommentRows(versionId, database),
    loadDocumentRows(versionId, database),
    loadScoringConfigurations(versionId, database),
    loadScoringCriteria(versionId, database),
  ]);
  return {
    checklists,
    comments,
    documents,
    scoringConfigurations,
    scoringCriteria,
  };
}

export function attachWorkflowStageRequirements(
  stages: WorkflowStageInput[],
  requirements: Awaited<ReturnType<typeof loadWorkflowStageRequirements>>,
) {
  const byId = new Map(stages.map((stage) => [stage.id, stage]));
  requirements.checklists.forEach(({ stageId, ...item }) => {
    byId.get(stageId)?.checklistItems.push(item);
  });
  requirements.comments.forEach(({ stageId, ...item }) => {
    byId.get(stageId)?.commentFields?.push(item);
  });
  requirements.documents.forEach(({ stageId, ...item }) => {
    byId.get(stageId)?.documentRequirements.push(item);
  });
  const configurations = new Map<
    string,
    NonNullable<WorkflowStageInput["scoring"]>[number]
  >();
  requirements.scoringConfigurations.forEach(
    ({ stageId, taskDefinitionId, aggregation, taskStableKey }) => {
      const stage = byId.get(stageId);
      if (!stage) return;
      const configuration = { aggregation, criteria: [], taskStableKey };
      configurations.set(taskDefinitionId, configuration);
      stage.scoring ??= [];
      stage.scoring.push(configuration);
    },
  );
  requirements.scoringCriteria.forEach(
    ({ stageId, taskDefinitionId, ...item }) => {
      void stageId;
      configurations.get(taskDefinitionId)?.criteria.push(item);
    },
  );
}
