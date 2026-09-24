import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { readLatestEligibilityIntegrationExecutions } = vi.hoisted(() => ({
  readLatestEligibilityIntegrationExecutions: vi.fn(),
}));

vi.mock(
  "@/modules/eligibility/infrastructure/EligibilityIntegrationRepository",
  () => ({ readLatestEligibilityIntegrationExecutions }),
);

import { createEligibilityIntegrationOutputAdapter } from "@/modules/eligibility/application/EligibilityIntegrationOutputAdapter";
import type { EligibilityScreeningSourceRequest } from "@/modules/eligibility/domain/EligibilityDataResolution";

function request(): EligibilityScreeningSourceRequest {
  return {
    applicationId: "application-1",
    binding: {
      sourceDefinitionId: "integration-version-1",
      sourceKey: "registered",
      sourceKind: "INTEGRATION_OUTPUT",
      sourceVersionId: "integration-version-1",
      valuePath: "value",
    },
    evaluatedAt: new Date("2026-09-22T08:00:00Z"),
    input: {
      availableIn: ["SCREENING"],
      createdAt: new Date("2026-09-22T08:00:00Z"),
      createdBy: "actor",
      groupKey: null,
      groupLabel: null,
      id: "input-1",
      label: "Registration",
      order: 1,
      screening: null,
      selfCheck: null,
      stableKey: "registered",
      type: "BOOLEAN",
      updatedAt: new Date("2026-09-22T08:00:00Z"),
      updatedBy: "actor",
      versionId: "ruleset-version-1",
    },
  };
}

describe("eligibility integration output adapter", () => {
  beforeEach(() => readLatestEligibilityIntegrationExecutions.mockReset());

  it("resolves explicit negative output as false instead of unavailable", async () => {
    readLatestEligibilityIntegrationExecutions.mockResolvedValue([{
      bindingId: "binding-1",
      executedAt: new Date("2026-09-22T07:00:00Z"),
      executionId: "execution-1",
      failureMessage: null,
      integrationVersionId: "integration-version-1",
      normalizedOutputs: { registered: false },
      status: "NEGATIVE",
    }]);

    const result = await createEligibilityIntegrationOutputAdapter({} as never)
      .resolve([request()]);

    expect(result.get("input-1")).toEqual({
      status: "RESOLVED",
      value: { sourceRecordId: "execution-1", value: false },
    });
  });

  it.each([
    ["TIMED_OUT", "timed out after its retry policy"],
    ["UNAVAILABLE", "provider unavailable"],
  ])("keeps %s separate from a negative result", async (status, message) => {
    readLatestEligibilityIntegrationExecutions.mockResolvedValue([{
      bindingId: "binding-1",
      executedAt: new Date("2026-09-22T07:00:00Z"),
      executionId: "execution-1",
      failureMessage: status === "UNAVAILABLE" ? message : null,
      integrationVersionId: "integration-version-1",
      normalizedOutputs: {},
      status,
    }]);

    const result = await createEligibilityIntegrationOutputAdapter({} as never)
      .resolve([request()]);

    expect(result.get("input-1")).toMatchObject({
      message: expect.stringContaining(message),
      status: "UNAVAILABLE",
    });
  });

  it("rejects an unnormalized integration value path", async () => {
    const invalid = request();
    invalid.binding.valuePath = "raw.match";

    const result = await createEligibilityIntegrationOutputAdapter({} as never)
      .resolve([invalid]);

    expect(result.get("input-1")).toMatchObject({ status: "INVALID" });
  });
});
