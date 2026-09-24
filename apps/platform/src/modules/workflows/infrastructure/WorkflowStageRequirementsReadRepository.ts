import "server-only";

import { asc, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  workflowStageChecklistDefinitions,
  stageTaskDefinitions,
  workflowStageCommentFields,
  workflowStageDefinitions,
  workflowStageDocumentRequirements,
  workflowStageScoringConfigurations,
  workflowStageScoringCriteria,
} from "@/db/schema";
import type { WorkflowStageInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";

function loadChecklistRows(versionId: string) {
  return getDatabase()
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
      eq(workflowStageDefinitions.id, workflowStageChecklistDefinitions.stageId),
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

function loadDocumentRows(versionId: string) {
  return getDatabase()
    .select({
      id: workflowStageDocumentRequirements.id,
      stageId: workflowStageDocumentRequirements.stageId,
      name: workflowStageDocumentRequirements.name,
      mandatory: workflowStageDocumentRequirements.mandatory,
      acceptedFileTypes: workflowStageDocumentRequirements.acceptedFileTypes,
      maximumSizeMb: workflowStageDocumentRequirements.maximumSizeMb,
      expiryDays: workflowStageDocumentRequirements.expiryDays,
      uploader: workflowStageDocumentRequirements.uploader,
      verifier: workflowStageDocumentRequirements.verifier,
      templateReference: workflowStageDocumentRequirements.templateReference,
    })
    .from(workflowStageDocumentRequirements)
    .innerJoin(
      workflowStageDefinitions,
      eq(workflowStageDefinitions.id, workflowStageDocumentRequirements.stageId),
    )
    .where(eq(workflowStageDefinitions.versionId, versionId))
    .orderBy(
      asc(workflowStageDocumentRequirements.stageId),
      asc(workflowStageDocumentRequirements.name),
    );
}

function loadScoringConfigurations(versionId: string) {
  return getDatabase()
    .select({
      stageId: workflowStageScoringConfigurations.stageId,
      aggregation: workflowStageScoringConfigurations.aggregation,
    })
    .from(workflowStageScoringConfigurations)
    .innerJoin(
      workflowStageDefinitions,
      eq(workflowStageDefinitions.id, workflowStageScoringConfigurations.stageId),
    )
    .where(eq(workflowStageDefinitions.versionId, versionId));
}

function loadScoringCriteria(versionId: string) {
  return getDatabase()
    .select({
      id: workflowStageScoringCriteria.id,
      stageId: workflowStageScoringCriteria.stageId,
      criterion: workflowStageScoringCriteria.criterion,
      description: workflowStageScoringCriteria.description,
      weight: workflowStageScoringCriteria.weight,
      scaleMinimum: workflowStageScoringCriteria.scaleMinimum,
      scaleMaximum: workflowStageScoringCriteria.scaleMaximum,
      threshold: workflowStageScoringCriteria.threshold,
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

function loadCommentFields(versionId: string) {
  return getDatabase()
    .select({
      id: workflowStageCommentFields.id,
      stageId: workflowStageCommentFields.stageId,
      key: workflowStageCommentFields.key,
      label: workflowStageCommentFields.label,
      helpText: workflowStageCommentFields.helpText,
      mandatory: workflowStageCommentFields.mandatory,
      visibility: workflowStageCommentFields.visibility,
      displayOrder: workflowStageCommentFields.displayOrder,
    })
    .from(workflowStageCommentFields)
    .innerJoin(
      workflowStageDefinitions,
      eq(workflowStageDefinitions.id, workflowStageCommentFields.stageId),
    )
    .where(eq(workflowStageDefinitions.versionId, versionId))
    .orderBy(
      asc(workflowStageCommentFields.stageId),
      asc(workflowStageCommentFields.displayOrder),
    );
}

export async function loadWorkflowStageRequirements(versionId: string) {
  const [checklists, documents, scoringConfigurations, scoringCriteria, comments]
    = await Promise.all([
      loadChecklistRows(versionId),
      loadDocumentRows(versionId),
      loadScoringConfigurations(versionId),
      loadScoringCriteria(versionId),
      loadCommentFields(versionId),
    ]);
  return { checklists, comments, documents, scoringConfigurations, scoringCriteria };
}

export function attachWorkflowStageRequirements(
  stages: WorkflowStageInput[],
  requirements: Awaited<ReturnType<typeof loadWorkflowStageRequirements>>,
) {
  const byId = new Map(stages.map((stage) => [stage.id, stage]));
  requirements.checklists.forEach(({ stageId, ...item }) => {
    byId.get(stageId)?.checklistItems.push(item);
  });
  requirements.documents.forEach(({ stageId, ...item }) => {
    byId.get(stageId)?.documentRequirements.push(item);
  });
  requirements.comments.forEach(({ stageId, ...item }) => {
    byId.get(stageId)?.commentFields.push(item);
  });
  requirements.scoringConfigurations.forEach(({ stageId, aggregation }) => {
    const stage = byId.get(stageId);
    if (stage) stage.scoring = { aggregation, criteria: [] };
  });
  requirements.scoringCriteria.forEach(({ stageId, ...item }) => {
    byId.get(stageId)?.scoring?.criteria.push(item);
  });
}
