import "server-only";

import { z } from "zod";
import { isAuthorizedServiceProcessorRequest } from "@/platform/jobs/ServiceProcessorAuthorization";

const configurationSchema = z.object({
  WORKFLOW_PROCESSOR_SECRET: z.string().min(32),
  WORKFLOW_PROCESSOR_BATCH_SIZE: z.coerce.number().int().min(1).max(100).default(25),
  WORKFLOW_PROCESSOR_EXECUTION_TIMEOUT_MS: z.coerce.number().int()
    .min(1_000).max(55_000).default(45_000),
});

export function parseWorkflowProcessorConfiguration(
  environment: Record<string, string | undefined>,
) {
  return configurationSchema.parse({
    ...environment,
    WORKFLOW_PROCESSOR_SECRET: environment.WORKFLOW_PROCESSOR_SECRET
      || environment.NOTIFICATION_PROCESSOR_SECRET,
  });
}

export function getWorkflowProcessorConfiguration() {
  return parseWorkflowProcessorConfiguration(process.env);
}

export const isAuthorizedWorkflowProcessorRequest = isAuthorizedServiceProcessorRequest;
