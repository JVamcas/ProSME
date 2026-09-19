import type { z } from "zod";

import {
  createWorkflowSchema,
  opportunityAssignmentSchema,
  updateWorkflowDraftSchema,
  updateWorkflowDetailsSchema,
} from "@/modules/workflows/api/WorkflowSchemas";

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type OpportunityAssignmentInput = z.infer<
  typeof opportunityAssignmentSchema
>;
export type UpdateWorkflowDraftInput = z.infer<
  typeof updateWorkflowDraftSchema
>;
export type UpdateWorkflowDetailsInput = z.infer<
  typeof updateWorkflowDetailsSchema
>;
