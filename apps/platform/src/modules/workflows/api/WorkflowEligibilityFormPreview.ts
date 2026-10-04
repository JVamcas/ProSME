import { z } from "zod";

export const workflowEligibilityPreviewQuerySchema = z.object({
  definitionId: z.uuid(),
  versionId: z.uuid(),
});

export const workflowEligibilityFormPreviewSchema = z.object({
  fundingCallId: z.uuid(),
  fundingCallTitle: z.string(),
  eligibilityRuleSetVersionId: z.uuid().nullable(),
  formVersionId: z.uuid().nullable(),
  formName: z.string().nullable(),
});

export type WorkflowEligibilityFormPreview = z.infer<
  typeof workflowEligibilityFormPreviewSchema
>;
