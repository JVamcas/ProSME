import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  lockAuthoritativeEligibilityTask,
  type AuthoritativeEligibilityExecutionTransaction,
} from "@/modules/eligibility/infrastructure/AuthoritativeEligibilityExecutionRepository";

const timestamp = "2026-09-26T14:08:02.424Z";

describe("authoritative eligibility task context", () => {
  it("decodes raw SQL timestamps before evaluation uses them", async () => {
    const execute = vi.fn().mockResolvedValue({
      rows: [{
        applicationBusinessSection: {},
        applicationDeclarationsSection: {},
        applicationFinancialSection: {},
        applicationProjectSection: {},
        applicationRowVersion: 1,
        assignedToActor: true,
        businessEmployeeCount: 5,
        businessEstablishedYear: 2020,
        businessRegistrationNumber: "B-123",
        businessUpdatedAt: timestamp,
        fundingCallClosesAt: timestamp,
        fundingCallMaximumAmount: "100000",
        fundingCallMinimumAmount: "1000",
        fundingCallOpensAt: timestamp,
        fundingCallTotalBudget: "500000",
        previousEvaluatedAt: timestamp,
        previousId: "previous-outcome",
        prerequisiteNames: [],
        rowVersion: 1,
      }],
    });
    const transaction = { execute } as unknown as
      AuthoritativeEligibilityExecutionTransaction;

    const target = await lockAuthoritativeEligibilityTask(
      transaction,
      "task-id",
      "actor-id",
    );

    expect(target?.business.updatedAt.toISOString()).toBe(timestamp);
    expect(target?.fundingCall.opensAt.toISOString()).toBe(timestamp);
    expect(target?.fundingCall.closesAt.toISOString()).toBe(timestamp);
    expect(target?.previousOutcome?.evaluatedAt.toISOString()).toBe(timestamp);
  });
});
