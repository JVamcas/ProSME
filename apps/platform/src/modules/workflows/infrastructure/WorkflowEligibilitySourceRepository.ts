import "server-only";

import { taskHasChecklist, taskRunsAuthoritativeEligibility } from "@/modules/workflows/WorkflowTaskRegistry";

import { and, eq, inArray } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type { ConditionFieldType } from "@/modules/conditions/domain/ConditionConfiguration";
import { formFields } from "@/modules/forms/infrastructure/form.schema";
import {
  checklistItemCompletionFactDefinition,
  checklistItemResponseFactKey,
  documentRequirementFactDefinitions,
} from "../domain/EvidenceFacts";
import {
  workflowStageChecklistDefinitions,
  workflowStageDocumentRequirements,
} from "./workflow-stage-requirements.schema";
import {
  stageTaskDefinitions,
  stageTaskFormBindings,
  workflowStageDefinitions,
} from "./workflow.schema";

const allConditionTypes = [
  "TEXT",
  "NUMBER",
  "BOOLEAN",
  "DATE",
] as const satisfies readonly ConditionFieldType[];

const formConditionTypes = {
  CURRENCY: "NUMBER",
  DATE: "DATE",
  NUMBER: "NUMBER",
  PERCENTAGE: "NUMBER",
  SINGLE_SELECT: "TEXT",
  TEXT: "TEXT",
  TEXTAREA: "TEXT",
  YES_NO: "BOOLEAN",
} as const satisfies Partial<Record<string, ConditionFieldType>>;

const checklistConditionTypes = {
  DATE: "DATE",
  NUMBER: "NUMBER",
  TEXT: "TEXT",
  YES_NO: "BOOLEAN",
} as const satisfies Record<string, ConditionFieldType>;

type Position = {
  stageSequence: number;
  taskOrder: number;
  hasChecklist?: boolean;
  hasDocumentReview?: boolean;
};

export type WorkflowEligibilitySource = {
  availableBeforeEligibility: boolean;
  label: string;
  sourceDefinitionId: string;
  sourceKey: string;
  sourceKind:
    | "WORKFLOW_FORM_FIELD"
    | "SCREENING_CHECKLIST_ITEM"
    | "DOCUMENT_REQUIREMENT_FACT"
    | "MANUAL_ASSESSMENT";
  sourceVersionId: string;
  supportedTypes: readonly ConditionFieldType[];
  workflowVersionId: string;
};

function isBefore(source: Position, target: Position | undefined) {
  if (!target) return false;
  return source.stageSequence < target.stageSequence
    || source.stageSequence === target.stageSequence
      && source.taskOrder < target.taskOrder;
}

function positionKey(versionId: string, stageId: string) {
  return `${versionId}:${stageId}`;
}

async function readSourceRecords(versions: string[]) {
  const database = getDatabase();
  return Promise.all([
    database
      .select({
        id: stageTaskDefinitions.id,
        label: stageTaskDefinitions.name,
        sourceKey: stageTaskDefinitions.stableKey,
        stageId: workflowStageDefinitions.id,
        stageSequence: workflowStageDefinitions.sequence,
        taskOrder: stageTaskDefinitions.displayOrder,
        config: stageTaskDefinitions.config,
        workflowVersionId: workflowStageDefinitions.versionId,
      })
      .from(stageTaskDefinitions)
      .innerJoin(
        workflowStageDefinitions,
        eq(workflowStageDefinitions.id, stageTaskDefinitions.stageId),
      )
      .where(and(
        inArray(workflowStageDefinitions.versionId, versions),
        eq(workflowStageDefinitions.enabled, true),
      )),
    database
      .select({
        id: formFields.id,
        key: formFields.key,
        label: formFields.label,
        stageSequence: workflowStageDefinitions.sequence,
        taskOrder: stageTaskDefinitions.displayOrder,
        type: formFields.type,
        versionId: formFields.formVersionId,
        workflowVersionId: workflowStageDefinitions.versionId,
      })
      .from(stageTaskFormBindings)
      .innerJoin(
        stageTaskDefinitions,
        eq(stageTaskDefinitions.id, stageTaskFormBindings.taskDefinitionId),
      )
      .innerJoin(
        workflowStageDefinitions,
        eq(workflowStageDefinitions.id, stageTaskDefinitions.stageId),
      )
      .innerJoin(
        formFields,
        eq(formFields.formVersionId, stageTaskFormBindings.formVersionId),
      )
      .where(and(
        inArray(workflowStageDefinitions.versionId, versions),
        eq(workflowStageDefinitions.enabled, true),
      )),
    database
      .select({
        id: workflowStageChecklistDefinitions.id,
        key: workflowStageChecklistDefinitions.key,
        label: workflowStageChecklistDefinitions.text,
        responseType: workflowStageChecklistDefinitions.responseType,
        stageId: workflowStageDefinitions.id,
        workflowVersionId: workflowStageDefinitions.versionId,
      })
      .from(workflowStageChecklistDefinitions)
      .innerJoin(
        workflowStageDefinitions,
        eq(workflowStageDefinitions.id, workflowStageChecklistDefinitions.stageId),
      )
      .where(and(
        inArray(workflowStageDefinitions.versionId, versions),
        eq(workflowStageDefinitions.enabled, true),
      )),
    database
      .select({
        id: workflowStageDocumentRequirements.id,
        label: workflowStageDocumentRequirements.name,
        stageId: workflowStageDefinitions.id,
        workflowVersionId: workflowStageDefinitions.versionId,
      })
      .from(workflowStageDocumentRequirements)
      .innerJoin(
        workflowStageDefinitions,
        eq(workflowStageDefinitions.id, workflowStageDocumentRequirements.stageId),
      )
      .where(and(
        inArray(workflowStageDefinitions.versionId, versions),
        eq(workflowStageDefinitions.enabled, true),
      )),
  ]);
}

export async function readWorkflowEligibilitySources(
  versionIds: readonly string[],
): Promise<WorkflowEligibilitySource[]> {
  if (!versionIds.length) return [];
  const [tasks, workflowFields, checklists, documents] =
    await readSourceRecords([...versionIds]);

  const eligibilityPositions = new Map<string, Position>();
  const stageTaskPositions = new Map<string, Position[]>();
  for (const task of tasks) {
    const position = {
      stageSequence: task.stageSequence,
      taskOrder: task.taskOrder,
      hasChecklist: taskHasChecklist(task.config),
      hasDocumentReview: Boolean(task.config && typeof task.config === "object"
        && "categories" in task.config && "outcomes" in task.config),
    };
    const positions = stageTaskPositions.get(
      positionKey(task.workflowVersionId, task.stageId),
    ) ?? [];
    positions.push(position);
    stageTaskPositions.set(
      positionKey(task.workflowVersionId, task.stageId),
      positions,
    );
    if (!taskRunsAuthoritativeEligibility(task.config)) continue;
    const current = eligibilityPositions.get(task.workflowVersionId);
    if (!current || isBefore(position, current)) {
      eligibilityPositions.set(task.workflowVersionId, position);
    }
  }

  const formSources = workflowFields.flatMap((field) => {
    const type = formConditionTypes[field.type as keyof typeof formConditionTypes];
    if (!type) return [];
    return [{
      availableBeforeEligibility: isBefore(
        { stageSequence: field.stageSequence, taskOrder: field.taskOrder },
        eligibilityPositions.get(field.workflowVersionId),
      ),
      label: field.label,
      sourceDefinitionId: field.id,
      sourceKey: field.key,
      sourceKind: "WORKFLOW_FORM_FIELD" as const,
      sourceVersionId: field.versionId,
      supportedTypes: [type],
      workflowVersionId: field.workflowVersionId,
    }];
  });
  const checklistSources = checklists.flatMap((item) => {
    const positions = (stageTaskPositions.get(
      positionKey(item.workflowVersionId, item.stageId),
    ) ?? []).filter((position) => position.hasChecklist);
    const sourcePosition = positions.toSorted((left, right) =>
      left.taskOrder - right.taskOrder
    )[0];
    const availableBeforeEligibility = Boolean(
      sourcePosition && isBefore(
        sourcePosition,
        eligibilityPositions.get(item.workflowVersionId),
      ),
    );
    const identity = {
      availableBeforeEligibility,
      sourceDefinitionId: item.id,
      sourceKind: "SCREENING_CHECKLIST_ITEM" as const,
      sourceVersionId: item.workflowVersionId,
      workflowVersionId: item.workflowVersionId,
    };
    return [{
      ...identity,
      label: `${item.label} — response`,
      sourceKey: checklistItemResponseFactKey,
      supportedTypes: [checklistConditionTypes[item.responseType]],
    }, {
      ...identity,
      label: `${item.label} — ${checklistItemCompletionFactDefinition.label}`,
      sourceKey: checklistItemCompletionFactDefinition.key,
      supportedTypes: [checklistItemCompletionFactDefinition.type],
    }];
  });
  const documentSources = documents.flatMap((document) => {
    const positions = (stageTaskPositions.get(
      positionKey(document.workflowVersionId, document.stageId),
    ) ?? []).filter((position) =>
      position.hasChecklist
      || position.hasDocumentReview
    );
    const sourcePosition = positions.toSorted((left, right) =>
      left.taskOrder - right.taskOrder
    )[0];
    const identity = {
      availableBeforeEligibility: Boolean(
        sourcePosition && isBefore(
          sourcePosition,
          eligibilityPositions.get(document.workflowVersionId),
        ),
      ),
      sourceDefinitionId: document.id,
      sourceKind: "DOCUMENT_REQUIREMENT_FACT" as const,
      sourceVersionId: document.workflowVersionId,
      workflowVersionId: document.workflowVersionId,
    };
    return documentRequirementFactDefinitions.map((fact) => ({
      ...identity,
      label: `${document.label} — ${fact.label}`,
      sourceKey: fact.key,
      supportedTypes: [fact.type],
    }));
  });
  const manualSources = tasks
    .filter((task) => !taskRunsAuthoritativeEligibility(task.config))
    .map((task) => ({
      availableBeforeEligibility: isBefore(
        { stageSequence: task.stageSequence, taskOrder: task.taskOrder },
        eligibilityPositions.get(task.workflowVersionId),
      ),
      label: task.label,
      sourceDefinitionId: task.id,
      sourceKey: task.sourceKey,
      sourceKind: "MANUAL_ASSESSMENT" as const,
      sourceVersionId: task.workflowVersionId,
      supportedTypes: allConditionTypes,
      workflowVersionId: task.workflowVersionId,
    }));
  return [
    ...formSources,
    ...checklistSources,
    ...documentSources,
    ...manualSources,
  ];
}
