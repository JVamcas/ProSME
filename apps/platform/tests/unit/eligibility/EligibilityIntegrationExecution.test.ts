import { describe, expect, it, vi } from "vitest";

import {
  executeEligibilityIntegration,
  validateIntegrationOutputs,
} from "@/modules/eligibility/domain/EligibilityIntegrationExecution";
import type {
  EligibilityIntegrationProviderAdapter,
  EligibilityIntegrationVersion,
} from "@/modules/eligibility/domain/EligibilityIntegration";

function version(
  overrides: Partial<EligibilityIntegrationVersion> = {},
): EligibilityIntegrationVersion {
  return {
    definitionId: "definition-1",
    id: "version-1",
    outputSchema: [{
      description: "Registration result",
      eligibleForScreening: true,
      key: "registered",
      label: "Registered",
      type: "BOOLEAN",
    }],
    rawResponsePolicy: { kind: "DISCARD" },
    retryPolicy: {
      initialBackoffMs: 1,
      maxAttempts: 3,
      timeoutMs: 1_000,
    },
    status: "PUBLISHED",
    versionNumber: 1,
    ...overrides,
  };
}

describe("configurable eligibility integration execution", () => {
  it("keeps an explicit negative result separate from provider failure", async () => {
    const adapter: EligibilityIntegrationProviderAdapter = {
      key: "business_register",
      async execute(request) {
        expect(request.secretReference).toBe(
          "secret-manager/eligibility/register",
        );
        return {
          normalizedOutputs: { registered: false },
          rawResponse: { match: false },
          status: "NEGATIVE",
        };
      },
    };

    await expect(executeEligibilityIntegration({
      adapter,
      applicationId: "application-1",
      fundingCallId: "call-1",
      provider: {
        secretReference: "secret-manager/eligibility/register",
      },
      version: version(),
    })).resolves.toMatchObject({
      attemptCount: 1,
      normalizedOutputs: { registered: false },
      rawResponse: null,
      status: "NEGATIVE",
    });
  });

  it("retries unavailable providers and records exhausted attempts", async () => {
    const execute = vi.fn().mockRejectedValue(new Error("offline"));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const result = await executeEligibilityIntegration({
      adapter: { execute, key: "business_register" },
      applicationId: "application-1",
      fundingCallId: "call-1",
      provider: { secretReference: null },
      sleep,
      version: version(),
    });

    expect(result).toMatchObject({
      attemptCount: 3,
      status: "UNAVAILABLE",
    });
    expect(execute).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("distinguishes timeout and applies configured raw retention", async () => {
    const result = await executeEligibilityIntegration({
      adapter: {
        async execute() {
          throw new DOMException("deadline", "TimeoutError");
        },
        key: "business_register",
      },
      applicationId: "application-1",
      fundingCallId: "call-1",
      provider: { secretReference: null },
      sleep: async () => undefined,
      version: version({
        rawResponsePolicy: { kind: "RETAIN", retentionDays: 7 },
        retryPolicy: {
          initialBackoffMs: 0,
          maxAttempts: 1,
          timeoutMs: 1_000,
        },
      }),
    });

    expect(result.status).toBe("TIMED_OUT");
  });

  it("validates manual and provider outputs against the same typed catalogue", () => {
    const schema = version().outputSchema;
    expect(validateIntegrationOutputs(schema, { registered: true })).toEqual([]);
    expect(validateIntegrationOutputs(schema, { registered: "yes" })).toEqual([
      'Output "registered" is not a valid BOOLEAN value.',
    ]);
    expect(validateIntegrationOutputs(schema, {
      extra: true,
      registered: true,
    })).toEqual(['Output "extra" is not declared.']);
  });
});
