import { z } from "zod";

export const workflowActionEmailContextSchema = z
  .object({
    applicationId: z.uuid(),
    applicationReference: z.string().min(1),
    fundingOpportunityTitle: z.string().min(1),
    stageName: z.string().min(1),
    actionLabel: z.string().min(1),
    actorName: z.string().min(1),
    subjectTemplate: z.string().min(1),
    htmlTemplate: z.string().min(1),
    plainTextTemplate: z.string().min(1),
  })
  .strict();

export const workflowActionEmailCatalogue = {
  "workflow.action.notification": {
    key: "workflow.action.notification",
    catalogKey: "WORKFLOW",
    ruleEligibility: "SYSTEM_ONLY",
    contextSchema: workflowActionEmailContextSchema,
  },
} as const;
