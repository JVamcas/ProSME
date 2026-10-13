import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import type { DatabaseTransaction } from "@/db/client";
import { formFields } from "@/modules/forms/infrastructure/form.schema";
import {
  stageTaskDefinitions,
  stageTaskFormBindings,
  workflowStageDefinitions,
} from "./workflow.schema";
import { workflowStageDocumentRequirements } from "./workflow-stage-requirements.schema";
import { formDocumentRequirement } from "../domain/definitions/FormDocumentRequirement";
import type { WorkflowGraphInput } from "../domain/definitions/WorkflowTypes";
import { taskUsesFormSections } from "../domain/definitions/WorkflowTaskFormWork";

const documentSelection = {
  versionId: formFields.formVersionId,
  label: formFields.label,
  required: formFields.required,
  workflowDocument: formFields.workflowDocument,
  key: formFields.key,
  uploadedBy: formFields.uploadedBy,
  acceptedExtensions: formFields.acceptedExtensions,
  maximumFileSizeMb: formFields.maximumFileSizeMb,
  maxPages: formFields.maxPages,
};

function requirementFromRow(row: {
  label: string;
  required: boolean;
  workflowDocument: import("@/modules/forms/FormTypes").FormField["workflowDocument"];
  key: string;
  uploadedBy:
    import("@/modules/forms/FormTypes").FormField["uploadedBy"] | null;
  acceptedExtensions:
    import("@/modules/forms/FormTypes").FormField["acceptedExtensions"] | null;
  maximumFileSizeMb: number | null;
  maxPages: number | null;
}) {
  return formDocumentRequirement({
    ...row,
    uploadedBy: row.uploadedBy ?? undefined,
    acceptedExtensions: row.acceptedExtensions ?? undefined,
    maximumFileSizeMb: row.maximumFileSizeMb ?? undefined,
    maxPages: row.maxPages ?? undefined,
  });
}

// Materialize the form's document policies for the existing evidence/RFI services.
export async function withFormDocumentRequirements(
  transaction: Pick<DatabaseTransaction, "select">,
  graph: WorkflowGraphInput,
) {
  const versionIds = [
    ...new Set(
      graph.stages.flatMap((stage) =>
        stage.tasks.flatMap((task) =>
          taskUsesFormSections(task.config) && task.formBinding
            ? [task.formBinding.formVersionId]
            : [],
        ),
      ),
    ),
  ];
  if (
    !graph.stages.some((stage) =>
      stage.tasks.some((task) => taskUsesFormSections(task.config)),
    )
  )
    return graph;
  const fields = versionIds.length
    ? await transaction
        .select(documentSelection)
        .from(formFields)
        .where(
          and(
            inArray(formFields.formVersionId, versionIds),
            eq(formFields.type, "DOCUMENT"),
          ),
        )
    : [];
  return {
    ...graph,
    stages: graph.stages.map((stage) => ({
      ...stage,
      documentRequirements: [
        ...stage.documentRequirements.filter(
          (requirement) =>
            !stage.tasks.some(
              (task) =>
                task.stableKey === requirement.taskStableKey &&
                taskUsesFormSections(task.config),
            ),
        ),
        ...stage.tasks.flatMap((task) =>
          taskUsesFormSections(task.config) && task.formBinding
            ? fields
                .filter(
                  (field) =>
                    field.versionId === task.formBinding!.formVersionId,
                )
                .map((field) => ({
                  ...requirementFromRow(field),
                  taskStableKey: task.stableKey,
                }))
            : [],
        ),
      ],
    })),
  };
}

export async function refreshFormDocumentRequirements(
  transaction: DatabaseTransaction,
  versionId: string,
) {
  // Only configuration rows for form-owned tasks are replaced, before publication.
  await transaction.execute(sql`
    DELETE FROM app_workflow_stage_document_requirements requirement
    USING app_stage_task_definitions task, app_workflow_stage_definitions stage
    WHERE requirement.task_definition_id = task.id AND task.stage_id = stage.id
      AND stage.version_id = ${versionId}::uuid AND task.config->>'workFormVersion' = '1'
  `);
  const fields = await transaction
    .select({
      ...documentSelection,
      stageId: workflowStageDefinitions.id,
      taskDefinitionId: stageTaskDefinitions.id,
    })
    .from(workflowStageDefinitions)
    .innerJoin(
      stageTaskDefinitions,
      eq(stageTaskDefinitions.stageId, workflowStageDefinitions.id),
    )
    .innerJoin(
      stageTaskFormBindings,
      eq(stageTaskFormBindings.taskDefinitionId, stageTaskDefinitions.id),
    )
    .innerJoin(
      formFields,
      eq(formFields.formVersionId, stageTaskFormBindings.formVersionId),
    )
    .where(
      and(
        eq(workflowStageDefinitions.versionId, versionId),
        eq(formFields.type, "DOCUMENT"),
        sql`${stageTaskDefinitions.config}->>'workFormVersion' = '1'`,
      ),
    );
  if (fields.length) {
    await transaction.insert(workflowStageDocumentRequirements).values(
      fields.map((field) => ({
        ...requirementFromRow(field),
        stageId: field.stageId,
        taskDefinitionId: field.taskDefinitionId,
      })),
    );
  }
}
