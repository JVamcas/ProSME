import "server-only";

import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

const configurationSchema = z.object({
  FUNDING_CALL_LIFECYCLE_PROCESSOR_SECRET: z
    .string()
    .min(
      32,
      "FUNDING_CALL_LIFECYCLE_PROCESSOR_SECRET must be at least 32 characters",
    ),
});

export function getFundingCallLifecycleProcessorConfiguration() {
  const parsed = configurationSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid funding call lifecycle configuration: ${details}`);
  }
  return parsed.data;
}

export function isAuthorizedFundingCallLifecycleRequest(
  authorizationHeader: string | null,
  expectedSecret: string,
) {
  if (!authorizationHeader?.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(authorizationHeader.slice("Bearer ".length));
  const expected = Buffer.from(expectedSecret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
