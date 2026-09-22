import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/eligibility/infrastructure/EligibilityInputRepository", () => ({
  findEligibilityInputDependencies: vi.fn(),
  listEligibilityInputs: vi.fn(),
}));
vi.mock("@/modules/eligibility/infrastructure/EligibilityInputWriteRepository", () => ({
  createEligibilityInput: vi.fn(),
  deleteEligibilityInput: vi.fn(),
  updateEligibilityInput: vi.fn(),
}));
vi.mock("@/modules/eligibility/infrastructure/EligibilityRuleSetRepository", () => ({
  findEligibilityRuleSetVersion: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  addEligibilityInput,
  EligibilityInputDependencyError,
  removeEligibilityInput,
} from "@/modules/eligibility/application/ServerEligibilityInputService";
import { listEligibilityInputs } from "@/modules/eligibility/infrastructure/EligibilityInputRepository";
import {
  createEligibilityInput,
  deleteEligibilityInput,
} from "@/modules/eligibility/infrastructure/EligibilityInputWriteRepository";
import { findEligibilityRuleSetVersion } from "@/modules/eligibility/infrastructure/EligibilityRuleSetRepository";

const actorId = "50000000-0000-4000-8000-000000000001";
const ruleSetId = "50000000-0000-4000-8000-000000000002";
const versionId = "50000000-0000-4000-8000-000000000003";
const inputId = "50000000-0000-4000-8000-000000000004";

function user(grants: string[]): AuthenticatedUser {
  return {
    capabilities: new Set(grants),
    createdAt: new Date(),
    displayName: "Eligibility administrator",
    email: "eligibility-inputs@example.test",
    id: actorId,
    identitySubject: "eligibility-inputs-subject",
    lastLoginAt: null,
    roleCodes: new Set(),
    status: "active",
    updatedAt: new Date(),
    userType: "staff",
  };
}

const input = {
  availableIn: ["SELF_CHECK" as const],
  expectedRowVersion: 1,
  groupKey: null,
  groupLabel: null,
  label: "Employee count",
  order: 1,
  screening: null,
  selfCheck: {
    answerType: "NUMBER" as const,
    explanation: "",
    helpText: "",
    options: [],
    prompt: "How many employees?",
    required: true,
  },
  stableKey: "employee_count",
  type: "NUMBER" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findEligibilityRuleSetVersion).mockResolvedValue({
    definition: { id: ruleSetId },
    version: { id: versionId, rowVersion: 2 },
  } as never);
  vi.mocked(listEligibilityInputs).mockResolvedValue([]);
});

describe("ServerEligibilityInputService", () => {
  it("adds a Draft input through the canonical update permission", async () => {
    vi.mocked(createEligibilityInput).mockResolvedValue({
      inputId,
      kind: "SUCCESS",
      rowVersion: 2,
    });

    await addEligibilityInput(
      user([permissionCodes.eligibilityRuleSetUpdate]),
      ruleSetId,
      versionId,
      input,
    );

    expect(createEligibilityInput).toHaveBeenCalledWith({
      actorId,
      definition: expect.objectContaining({ stableKey: "employee_count" }),
      expectedRowVersion: 1,
      ruleSetId,
      versionId,
    });
  });

  it("denies writes without the canonical update permission", async () => {
    await expect(addEligibilityInput(
      user([permissionCodes.eligibilityRuleSetRead]),
      ruleSetId,
      versionId,
      input,
    )).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(createEligibilityInput).not.toHaveBeenCalled();
  });

  it("reports every rule that blocks deletion", async () => {
    vi.mocked(deleteEligibilityInput).mockResolvedValue({
      dependencies: [
        { reasonCode: "EMPLOYEE_MINIMUM", ruleId: inputId },
        { reasonCode: "EMPLOYEE_WARNING", ruleId: versionId },
      ],
      kind: "DEPENDENCIES",
    });

    const operation = removeEligibilityInput(
      user([permissionCodes.eligibilityRuleSetUpdate]),
      ruleSetId,
      versionId,
      inputId,
      1,
    );

    await expect(operation).rejects.toBeInstanceOf(
      EligibilityInputDependencyError,
    );
    await expect(operation).rejects.toThrow(
      "EMPLOYEE_MINIMUM",
    );
  });
});
