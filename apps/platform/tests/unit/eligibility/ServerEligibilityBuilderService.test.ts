import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/eligibility/infrastructure/EligibilityBuilderRepository", () => ({
  findEligibilityRuleSetBuilder: vi.fn(),
  listEligibilityRuleSets: vi.fn(),
}));
vi.mock("@/modules/eligibility/application/ServerEligibilityRuleSetService", () => ({
  updateEligibilityRuleSet: vi.fn(),
}));
vi.mock("@/modules/funding-calls/ServerFundingCallEligibilityContextIntegration", () => ({
  resolveEligibilityRuleSetContexts: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  getEligibilityRuleSetBuilder,
  saveEligibilityRuleSetBuilder,
} from "@/modules/eligibility/application/ServerEligibilityBuilderService";
import { updateEligibilityRuleSet } from "@/modules/eligibility/application/ServerEligibilityRuleSetService";
import { findEligibilityRuleSetBuilder } from "@/modules/eligibility/infrastructure/EligibilityBuilderRepository";
import { resolveEligibilityRuleSetContexts } from "@/modules/funding-calls/ServerFundingCallEligibilityContextIntegration";

const actorId = "60000000-0000-4000-8000-000000000001";
const ruleSetId = "60000000-0000-4000-8000-000000000002";
const versionId = "60000000-0000-4000-8000-000000000003";
const ruleId = "60000000-0000-4000-8000-000000000004";
const groupId = "60000000-0000-4000-8000-000000000005";

function user(grants: string[]): AuthenticatedUser {
  return {
    capabilities: new Set(grants),
    createdAt: new Date(),
    displayName: "Eligibility administrator",
    email: "eligibility@example.test",
    id: actorId,
    identitySubject: "eligibility-subject",
    lastLoginAt: null,
    roleCodes: new Set(),
    status: "active",
    updatedAt: new Date(),
    userType: "staff",
  };
}

const condition = {
  children: [{
    id: "60000000-0000-4000-8000-000000000006",
    kind: "CONDITION" as const,
    leftOperand: {
      key: "application.EMPLOYEE_COUNT",
      kind: "FIELD" as const,
    },
    operator: "GREATER_THAN" as never,
    rightOperand: { kind: "CONSTANT" as const, value: 0 },
  }],
  combinator: "AND" as const,
  id: groupId,
  kind: "GROUP" as const,
};

const builder = {
  allowedActions: ["UPDATE", "PUBLISH"],
  definition: { id: ruleSetId },
  rules: [],
  version: { id: versionId, rowVersion: 1, status: "DRAFT" },
  versions: [],
} as never;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findEligibilityRuleSetBuilder).mockResolvedValue(builder);
  vi.mocked(updateEligibilityRuleSet).mockResolvedValue({} as never);
  vi.mocked(resolveEligibilityRuleSetContexts).mockResolvedValue([{
    formFields: [{
      key: "EMPLOYEE_COUNT",
      label: "Employee count",
      type: "NUMBER",
    }],
    id: "60000000-0000-4000-8000-000000000007",
    title: "Growth Fund",
  }] as never);
});

describe("ServerEligibilityBuilderService", () => {
  it("denies builder reads without the canonical read permission", async () => {
    await expect(getEligibilityRuleSetBuilder(
      user([permissionCodes.eligibilityRuleSetCreate]),
      ruleSetId,
    )).rejects.toBeInstanceOf(PermissionDeniedError);

    expect(findEligibilityRuleSetBuilder).not.toHaveBeenCalled();
  });

  it("maps visual condition groups into the draft update command", async () => {
    const actor = user([
      permissionCodes.eligibilityRuleSetRead,
      permissionCodes.eligibilityRuleSetUpdate,
    ]);
    const rule = {
      applicantMessage: "Employ at least one person.",
      condition,
      executionMode: "BOTH" as const,
      failureType: "HARD_FAIL" as const,
      id: ruleId,
      order: 1,
      reasonCode: "EMPLOYEE_REQUIRED",
    };

    await saveEligibilityRuleSetBuilder(actor, ruleSetId, {
      expectedRowVersion: 1,
      rules: [rule],
    });

    expect(updateEligibilityRuleSet).toHaveBeenCalledWith(
      actor,
      ruleSetId,
      versionId,
      {
        conditionDefinitions: [condition],
        expectedRowVersion: 1,
        rules: [{
          applicantMessage: rule.applicantMessage,
          condition: { conditionGroupId: groupId, kind: "GROUP" },
          executionMode: "BOTH",
          failureType: "HARD_FAIL",
          id: ruleId,
          order: 1,
          reasonCode: "EMPLOYEE_REQUIRED",
        }],
      },
    );
  });

  it("allows every rule to be deleted after its binding is removed", async () => {
    const actor = user([
      permissionCodes.eligibilityRuleSetRead,
      permissionCodes.eligibilityRuleSetUpdate,
    ]);
    vi.mocked(resolveEligibilityRuleSetContexts).mockResolvedValue([]);

    await saveEligibilityRuleSetBuilder(actor, ruleSetId, {
      expectedRowVersion: 1,
      rules: [],
    });

    expect(updateEligibilityRuleSet).toHaveBeenCalledWith(
      actor,
      ruleSetId,
      versionId,
      {
        conditionDefinitions: [],
        expectedRowVersion: 1,
        rules: [],
      },
    );
  });
});
