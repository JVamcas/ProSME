import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/eligibility/infrastructure/EligibilityRuleSetRepository",
  () => ({
    createEligibilityRuleSet: vi.fn(),
    findEligibilityRuleSet: vi.fn(),
    findEligibilityRuleSetVersion: vi.fn(),
    InvalidEligibilityRulesError: class InvalidEligibilityRulesError extends Error {
      issues = [];
    },
    publishEligibilityRuleSetVersion: vi.fn(),
    retireEligibilityRuleSetVersion: vi.fn(),
  }),
);
vi.mock(
  "@/modules/eligibility/infrastructure/EligibilityRuleSetCloneRepository",
  () => ({
    cloneEligibilityRuleSetVersion: vi.fn(),
  }),
);
vi.mock(
  "@/modules/eligibility/infrastructure/EligibilityRuleSetWriteRepository",
  () => ({
    updateEligibilityRuleSetDefinition: vi.fn(),
    updateEligibilityRuleSetDraft: vi.fn(),
  }),
);

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  createNewEligibilityRuleSet,
  cloneEligibilityRuleSet,
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
import { cloneEligibilityRuleSetVersion } from "@/modules/eligibility/infrastructure/EligibilityRuleSetCloneRepository";

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
  it("denies draft creation without the exact update permission", async () => {
    await expect(
      cloneEligibilityRuleSet(
        user([permissionCodes.eligibilityRuleSetRead]),
        ruleSetId,
        versionId,
      ),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(cloneEligibilityRuleSetVersion).not.toHaveBeenCalled();
  });
  it("returns the exact resumed draft even when another version is newer", async () => {
    const sourceVersionId = "10000000-0000-4000-8000-000000000004";
    vi.mocked(cloneEligibilityRuleSetVersion).mockResolvedValue({
      id: versionId,
    } as never);
    const result = await cloneEligibilityRuleSet(
      user([permissionCodes.eligibilityRuleSetUpdate]),
      ruleSetId,
      sourceVersionId,
    );
    expect(result).toBe(stored);
    expect(findEligibilityRuleSetVersion).toHaveBeenCalledWith(versionId);
    expect(findEligibilityRuleSet).not.toHaveBeenCalled();
    expect(cloneEligibilityRuleSetVersion).toHaveBeenCalledWith({
      actorId,
      ruleSetId,
      sourceVersionId,
    });
  });
  it("creates version 1 through the create permission", async () => {
    vi.mocked(createEligibilityRuleSet).mockResolvedValue({
      definition: { id: ruleSetId },
      version: { id: versionId },
    } as never);

    await createNewEligibilityRuleSet(
      user([permissionCodes.eligibilityRuleSetCreate]),
      { code: "SME Fund", description: "SME Fund rules", name: "SME Fund" },
    );

    expect(createEligibilityRuleSet).toHaveBeenCalledWith({
      actorId,
      code: "SME Fund",
      description: "SME Fund rules",
      name: "SME Fund",
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
      {
        conditionDefinitions: [],
        expectedRowVersion: 1,
        questionIds: [],
        rules: [],
      },
    );

    expect(updateEligibilityRuleSetDraft).toHaveBeenCalledWith({
      actorId,
      conditionDefinitions: [],
      expectedRowVersion: 1,
      questionIds: [],
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
      { code: "SME Fund", description: "Updated rules", name: "SME Fund" },
    );

    expect(updateEligibilityRuleSetDefinition).toHaveBeenCalledWith({
      actorId,
      code: "SME Fund",
      description: "Updated rules",
      name: "SME Fund",
      ruleSetId,
    });
  });

  it("denies exact-version reads without their canonical permission", async () => {
    await expect(
      getEligibilityRuleSetVersion(
        user([permissionCodes.eligibilityRuleSetCreate]),
        versionId,
      ),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(findEligibilityRuleSetVersion).not.toHaveBeenCalled();
  });
});
