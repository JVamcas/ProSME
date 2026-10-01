import { z } from "zod";

import type { WorkflowStageDeletionInspection } from "../../domain/definitions/WorkflowStageDeletion";

export const workflowStageDeletionFormSchema = z.object({
  reconnections: z.array(z.object({
    targetStageKeys: z.array(z.string()),
    transitionIndex: z.number().int().nonnegative(),
  })),
});

export type WorkflowStageDeletionFormValues = z.infer<
  typeof workflowStageDeletionFormSchema
>;

export function workflowStageDeletionDefaults(
  inspection: WorkflowStageDeletionInspection,
): WorkflowStageDeletionFormValues {
  return {
    reconnections: inspection.incomingRoutes.map((route) => ({
      targetStageKeys: [],
      transitionIndex: route.transitionIndex,
    })),
  };
}
