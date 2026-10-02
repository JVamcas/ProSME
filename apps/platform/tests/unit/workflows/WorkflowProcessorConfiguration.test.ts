import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import {
  parseWorkflowProcessorConfiguration,
  isAuthorizedWorkflowProcessorRequest,
} from "@/modules/workflows/application/runtime/WorkflowProcessorConfiguration";

const secret = "workflow-processor-test-secret-32-characters";

describe("workflow processor credentials and limits", () => {
  it("reuses the deployment processor secret unless overridden", () => {
    expect(parseWorkflowProcessorConfiguration({ NOTIFICATION_PROCESSOR_SECRET: secret }))
      .toMatchObject({ WORKFLOW_PROCESSOR_SECRET: secret, WORKFLOW_PROCESSOR_BATCH_SIZE: 25 });
    expect(parseWorkflowProcessorConfiguration({
      NOTIFICATION_PROCESSOR_SECRET: secret,
      WORKFLOW_PROCESSOR_SECRET: `${secret}-isolated`,
    }).WORKFLOW_PROCESSOR_SECRET).toBe(`${secret}-isolated`);
  });

  it.each([undefined, "", "short"])("rejects missing or weak credentials: %s", (value) => {
    expect(() => parseWorkflowProcessorConfiguration({ WORKFLOW_PROCESSOR_SECRET: value })).toThrow();
  });

  it.each(["0", "101", "1.5"])("rejects an invalid batch size: %s", (value) => {
    expect(() => parseWorkflowProcessorConfiguration({
      WORKFLOW_PROCESSOR_SECRET: secret,
      WORKFLOW_PROCESSOR_BATCH_SIZE: value,
    })).toThrow();
  });

  it("requires the service bearer and rejects ordinary user credentials", () => {
    expect(isAuthorizedWorkflowProcessorRequest(`Bearer ${secret}`, secret)).toBe(true);
    expect(isAuthorizedWorkflowProcessorRequest(null, secret)).toBe(false);
    expect(isAuthorizedWorkflowProcessorRequest("Bearer firebase-user-token", secret)).toBe(false);
    expect(isAuthorizedWorkflowProcessorRequest(`Basic ${secret}`, secret)).toBe(false);
  });
});
