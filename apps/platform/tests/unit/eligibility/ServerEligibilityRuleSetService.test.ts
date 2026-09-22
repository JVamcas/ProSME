import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/eligibility/infrastructure/EligibilityRuleSetRepository", () => ({
  createEligibilityRuleSet: vi.fn(),
  findEligibilityRuleSet: vi.fn(),
  findEligibilityRuleSetVersion: vi.fn(),
  InvalidEligibilityRulesError: class InvalidEligibilityRulesError extends Error {
    issues = [];
  },
  publishEligibilityRuleSetVersion: vi.fn(),
  retireEligibilityRuleSetVersion: vi.fn(),
}));
vi.mock("@/modules/eligibility/infrastructure/EligibilityRuleSetCloneRepository", () => ({
  cloneEligibilityRuleSetVersion: vi.fn(),
}));
vi.mock("@/modules/eligibility/infrastructure/EligibilityRuleSetWriteRepository", () => ({
  updateEligibilityRuleSetDefinition: vi.fn(),
  updateEligibilityRuleSetDraft: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  createNewEligibilityRuleSet,
  getEligibilityRuleSetVersion,
  updateEligibilityRuleSet,
  updateEligibilityRuleSetMetadata,
} from "@/modules/eligibility/application/ServerEligibilityRuleSetService";
import {
  updateEligibilityRuleSetDefinition,
  updateEligibilityRuleSetDraft,
} from "@/modules/eligibility/infrastructure/EligibilityRuleSetWriteRepository";
import {
  createEligibilityRuleSet,
  findEligibilityRuleSet,
  findEligibilityRuleSetVersion,
} from "@/modules/eligibility/infrastructure/EligibilityRuleSetRepository";

const actorId = "10000000-0000-4000-8000-000000000001";
const ruleSetId = "10000000-0000-4000-8000-000000000002";
const versionId = "10000000-0000-4000-8000-000000000003";
const stored = {
  definition: { id: ruleSetId },
  rules: [],
  version: { id: versionId, status: "DRAFT" },
  versions: [],
} as never;

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

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findEligibilityRuleSet).mockResolvedValue(stored);
  vi.mocked(findEligibilityRuleSetVersion).mockResolvedValue(stored);
});

describe("ServerEligibilityRuleSetService", () => {
  it("creates version 1 through the create permission", async () => {
    vi.mocked(createEligibilityRuleSet).mockResolvedValue({
      definition: { id: ruleSetId },
      version: { id: versionId },
    } as never);

    await createNewEligibilityRuleSet(
      user([permissionCodes.eligibilityRuleSetCreate]),
      { code: "SME", description: "SME rules", name: "SME" },
    );

    expect(createEligibilityRuleSet).toHaveBeenCalledWith({
      actorId,
      code: "SME",
      description: "SME rules",
      name: "SME",
    });
  });

  it("uses the update permission for draft rules", async () => {
    vi.mocked(updateEligibilityRuleSetDraft).mockResolvedValue({
      id: versionId,
    } as never);

    await updateEligibilityRuleSet(
      user([permissionCodes.eligibilityRuleSetUpdate]),
      ruleSetId,
      versionId,
      { conditionDefinitions: [], expectedRowVersion: 1, rules: [] },
    );

    expect(updateEligibilityRuleSetDraft).toHaveBeenCalledWith({
      actorId,
      conditionDefinitions: [],
      expectedRowVersion: 1,
      ruleSetId,
      rules: [],
      versionId,
    });
  });

  it("updates definition metadata through the update permission", async () => {
    vi.mocked(updateEligibilityRuleSetDefinition).mockResolvedValue({
      id: ruleSetId,
    } as never);

    await updateEligibilityRuleSetMetadata(
      user([permissionCodes.eligibilityRuleSetUpdate]),
      ruleSetId,
      { code: "SME", description: "Updated rules", name: "SME Fund" },
    );

    expect(updateEligibilityRuleSetDefinition).toHaveBeenCalledWith({
      code: "SME",
      description: "Updated rules",
      name: "SME Fund",
      ruleSetId,
    });
  });

  it("denies exact-version reads without their canonical permission", async () => {
    await expect(getEligibilityRuleSetVersion(
      user([permissionCodes.eligibilityRuleSetCreate]),
      versionId,
    )).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(findEligibilityRuleSetVersion).not.toHaveBeenCalled();
  });
});
