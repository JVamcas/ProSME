import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/eligibility/infrastructure/EligibilityIntegrationRepository",
  () => ({
    createEligibilityIntegration: vi.fn(),
    createEligibilityIntegrationVersion: vi.fn(),
    insertEligibilityIntegrationExecution: vi.fn(),
    publishEligibilityIntegrationVersion: vi.fn(),
    readEligibilityIntegrationCatalogue: vi.fn(),
  }),
);

vi.mock(
  "@/modules/eligibility/infrastructure/EligibilityIntegrationBindingRepository",
  () => ({
    bindEligibilityIntegration: vi.fn(),
    readApplicationIntegrationBinding: vi.fn(),
  }),
);
import {
  bindEligibilityIntegration,
  readApplicationIntegrationBinding,
} from "@/modules/eligibility/infrastructure/EligibilityIntegrationBindingRepository";
import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import {
  bindFundingCallEligibilityIntegration,
  recordManualEligibilityIntegrationResult,
} from "@/modules/eligibility/application/ServerEligibilityIntegrationService";
import { insertEligibilityIntegrationExecution } from "@/modules/eligibility/infrastructure/EligibilityIntegrationRepository";

const actorId = "50000000-0000-4000-8000-000000000001";

function user(grants: string[]): AuthenticatedUser {
  return {
    capabilities: new Set(grants),
    createdAt: new Date(),
    displayName: "Integration verifier",
    email: "integration-verifier@example.test",
    id: actorId,
    identitySubject: "integration-verifier-subject",
    lastLoginAt: null,
    roleCodes: new Set(),
    status: "active",
    updatedAt: new Date(),
    userType: "staff",
  };
}

const binding = {
  fundingCallId: "call-1",
  id: "binding-1",
  integrationVersion: {
    definitionId: "definition-1",
    id: "version-1",
    outputSchema: [
      {
        description: "Registration status",
        eligibleForScreening: true,
        key: "registered",
        label: "Registered",
        type: "BOOLEAN" as const,
      },
    ],
    rawResponsePolicy: { kind: "DISCARD" as const },
    retryPolicy: {
      initialBackoffMs: 0,
      maxAttempts: 1,
      timeoutMs: 1_000,
    },
    status: "PUBLISHED" as const,
    versionNumber: 1,
  },
  manualFallbackAllowed: true,
  providerAdapterKey: "register_a",
  providerDisplayName: "Register A",
  secretReference: null,
  workflowTemplateVersionId: "workflow-1",
};

describe("funding call integration binding authorization", () => {
  beforeEach(() => vi.clearAllMocks());
  const input = {
    integrationVersionId: "50000000-0000-4000-8000-000000000002",
    manualFallbackAllowed: false,
    providerAdapterKey: "register_a",
    providerDisplayName: "Register A",
    secretReference: null,
  };
  it.each([
    [permissionCodes.integrationEligibilityBind],
    [permissionCodes.fundingCallEditDraft],
  ])(
    "requires both integration binding and draft editing permissions",
    async (...grants) => {
      await expect(
        bindFundingCallEligibilityIntegration(user(grants), "call-1", input),
      ).rejects.toBeInstanceOf(PermissionDeniedError);
      expect(bindEligibilityIntegration).not.toHaveBeenCalled();
    },
  );
  it("allows replacement configuration with the canonical draft edit permission", async () => {
    vi.mocked(bindEligibilityIntegration).mockResolvedValue({
      kind: "BOUND",
      binding,
      version: binding.integrationVersion,
    } as never);
    await bindFundingCallEligibilityIntegration(
      user([
        permissionCodes.integrationEligibilityBind,
        permissionCodes.fundingCallEditDraft,
      ]),
      "call-1",
      input,
    );
    expect(bindEligibilityIntegration).toHaveBeenCalledWith(
      actorId,
      "call-1",
      input,
    );
  });
});

describe("manual eligibility integration fallback authorization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("denies fallback without the canonical manual-verification permission", async () => {
    await expect(
      recordManualEligibilityIntegrationResult(
        user([permissionCodes.integrationEligibilityRead]),
        "application-1",
        "binding-1",
        {
          evidenceReference: "case-file-1",
          normalizedOutputs: { registered: true },
          status: "SUCCEEDED",
        },
      ),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(readApplicationIntegrationBinding).not.toHaveBeenCalled();
  });

  it("rejects an application that does not match the exact binding context", async () => {
    vi.mocked(readApplicationIntegrationBinding).mockResolvedValue(null);

    await expect(
      recordManualEligibilityIntegrationResult(
        user([permissionCodes.integrationEligibilityManualVerify]),
        "application-2",
        "binding-1",
        {
          evidenceReference: "case-file-1",
          normalizedOutputs: { registered: true },
          status: "SUCCEEDED",
        },
      ),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(insertEligibilityIntegrationExecution).not.toHaveBeenCalled();
  });

  it("writes normalized manual evidence through the same bound version", async () => {
    vi.mocked(readApplicationIntegrationBinding).mockResolvedValue(binding);
    vi.mocked(insertEligibilityIntegrationExecution).mockResolvedValue({
      id: "execution-1",
    } as never);

    await recordManualEligibilityIntegrationResult(
      user([permissionCodes.integrationEligibilityManualVerify]),
      "application-1",
      "binding-1",
      {
        evidenceReference: "case-file-1",
        normalizedOutputs: { registered: false },
        status: "NEGATIVE",
      },
    );

    expect(insertEligibilityIntegrationExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId,
        applicationId: "application-1",
        binding,
        executionSource: "MANUAL",
        result: expect.objectContaining({
          normalizedOutputs: { registered: false },
          status: "NEGATIVE",
        }),
      }),
    );
  });
});
