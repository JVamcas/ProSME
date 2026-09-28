import "server-only";

import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

const processorConfigurationSchema = z.object({
  NOTIFICATION_PROCESSOR_BATCH_SIZE: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25),
  NOTIFICATION_PROCESSOR_EXECUTION_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(55_000)
    .default(45_000),
  NOTIFICATION_PROCESSOR_LOCK_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(60_000)
    .max(3_600_000)
    .default(300_000),
  NOTIFICATION_PROCESSOR_SECRET: z
    .string()
    .min(32, "NOTIFICATION_PROCESSOR_SECRET must be at least 32 characters"),
});

export type NotificationProcessorConfiguration = z.infer<
  typeof processorConfigurationSchema
>;

export function parseNotificationProcessorConfiguration(
  environment: Record<string, string | undefined>,
): NotificationProcessorConfiguration {
  const parsed = processorConfigurationSchema.safeParse(environment);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid notification processor configuration: ${details}`);
  }
  return parsed.data;
}

export function getNotificationProcessorConfiguration() {
  return parseNotificationProcessorConfiguration(process.env);
}

export function isAuthorizedNotificationProcessorRequest(
  authorizationHeader: string | null,
  expectedSecret: string,
): boolean {
  if (!authorizationHeader?.startsWith("Bearer ")) return false;
  const suppliedSecret = authorizationHeader.slice("Bearer ".length);
  const supplied = Buffer.from(suppliedSecret);
  const expected = Buffer.from(expectedSecret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
