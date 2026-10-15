import { z } from "zod";
import { workflowActionDeletionSchema } from "./WorkflowActionDeletionSchema";
import { workflowActionDefinitionSchema } from "../domain/actions/WorkflowActionSchemas";
import { isSupportedWorkflowAction } from "../domain/actions/WorkflowActionDefinition";
import { workflowTransitionSchema } from "../domain/transitions/WorkflowTransitionSchemas";

export const workflowActionSaveSchema = workflowActionDeletionSchema
  .omit({ actionKey: true })
  .extend({
    actionKey: workflowActionDeletionSchema.shape.actionKey.nullable(),
    action: workflowActionDefinitionSchema.refine(
      (action) => isSupportedWorkflowAction(action.actionType),
      "This action type is no longer supported.",
    ),
    taskStableKeys: z
      .array(workflowActionDeletionSchema.shape.stageKey)
      .max(100),
    routes: z.array(workflowTransitionSchema).max(100),
  })
  .strict();

export type WorkflowActionSaveInput = z.infer<typeof workflowActionSaveSchema>;
