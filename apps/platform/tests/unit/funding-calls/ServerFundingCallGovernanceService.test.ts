import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/funding-calls/infrastructure/FundingCallRepository", () => ({
  readFundingCallById: vi.fn(),
}));
vi.mock(
  "@/modules/funding-calls/infrastructure/FundingCallGovernanceRepository",
  () => ({ changeFundingCallGovernance: vi.fn() }),
);
vi.mock(
  "@/modules/funding-calls/application/ServerFundingCallReadinessService",
  () => ({ validateFundingCallReadiness: vi.fn() }),
);

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceConflictError } from "@/lib/resource-errors";
import { changeFundingCallGovernanceStatus } from "@/modules/funding-calls/application/ServerFundingCallGovernanceService";
import { validateFundingCallReadiness } from "@/modules/funding-calls/application/ServerFundingCallReadinessService";
import { changeFundingCallGovernance } from "@/modules/funding-calls/infrastructure/FundingCallGovernanceRepository";
import { readFundingCallById } from "@/modules/funding-calls/infrastructure/FundingCallRepository";

const actorId = "10000000-0000-4000-8000-000000000001";
const callId = "00000000-0000-4000-8000-000000000042";
const call = {
  applicationDuplicatePolicy: "one_per_business" as const,
  closesAt: new Date("2027-03-31T15:00:00.000Z"),
  createdAt: new Date("2026-09-20T08:00:00.000Z"),
  createdBy: actorId,
  description: "Growth funding for qualifying SMEs.",
  eligibilityRuleSetVersionId: "30000000-0000-4000-8000-000000000001",
  eligibilitySummary: "Registered SMEs may qualify.",
  formVersionId: "20000000-0000-4000-8000-000000000001",
  fundingInstrument: "Grant",
  id: callId,
  maximumGrantAmount: "500000.00",
  minimumGrantAmount: "50000.00",
  opensAt: new Date("2027-02-01T06:00:00.000Z"),
  publicContactEmail: "funding@example.test",
  publicContactName: "SME Fund",
  publicContactPhone: null,
  reference: "SME-2027-01",
  rowVersion: 4,
  slug: "sme-growth-fund-2027",
  status: "DRAFT" as const,
  suspendedFromStatus: null,
  thematicArea: "Business growth",
  title: "SME Growth Fund 2027",
  totalBudgetEnvelope: "10000000.00",
  updatedAt: new Date("2026-09-21T08:00:00.000Z"),
  updatedBy: actorId,
  workflowTemplateVersionId: "40000000-0000-4000-8000-000000000001",
};

function user(grants: string[]): AuthenticatedUser {
  return {
    capabilities: new Set(grants),
    createdAt: new Date(),
    displayName: "Governance actor",
    email: "governance@example.test",
    id: actorId,
    identitySubject: "governance-subject",
    lastLoginAt: null,
    roleCodes: new Set(),
    status: "active",
    updatedAt: new Date(),
    userType: "staff",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readFundingCallById).mockResolvedValue(call);
  vi.mocked(validateFundingCallReadiness).mockResolvedValue({
    checkedAt: "2026-09-22T00:00:00.000Z",
    fundingCallId: callId,
    issues: [],
    ready: true,
    rowVersion: 4,
  });
});

describe("funding call governance service", () => {
  it("requires the distinct submit permission and current readiness", async () => {
    await expect(changeFundingCallGovernanceStatus(
      user([permissionCodes.fundingCallUpdate]),
      callId,
      { command: "SUBMIT_FOR_APPROVAL", expectedRowVersion: 4 },
      "submit-key",
      "correlation-id",
    )).rejects.toBeInstanceOf(PermissionDeniedError);

    expect(validateFundingCallReadiness).not.toHaveBeenCalled();
    expect(changeFundingCallGovernance).not.toHaveBeenCalled();
  });

  it("submits a valid draft and records the concurrency inputs", async () => {
    vi.mocked(changeFundingCallGovernance).mockResolvedValue({
      call: { ...call, rowVersion: 5, status: "APPROVAL_PENDING" },
      kind: "transitioned",
    });

    const result = await changeFundingCallGovernanceStatus(
      user([permissionCodes.fundingCallSubmitAll]),
      callId,
      { command: "SUBMIT_FOR_APPROVAL", expectedRowVersion: 4 },
      "submit-key",
      "correlation-id",
    );

    expect(validateFundingCallReadiness).toHaveBeenCalledWith(
      call,
      expect.any(Date),
    );
    expect(changeFundingCallGovernance).toHaveBeenCalledWith({
      actorId,
      command: "SUBMIT_FOR_APPROVAL",
      correlationId: "correlation-id",
      expectedRowVersion: 4,
      fundingCallId: callId,
      idempotencyKey: "submit-key",
      now: expect.any(Date),
      reason: undefined,
    });
    expect(result.status).toBe("APPROVAL_PENDING");
  });

  it("reruns readiness before approving the exact pending row", async () => {
    const pending = { ...call, rowVersion: 5, status: "APPROVAL_PENDING" as const };
    vi.mocked(readFundingCallById).mockResolvedValue(pending);
    vi.mocked(changeFundingCallGovernance).mockResolvedValue({
      call: { ...pending, rowVersion: 6, status: "APPROVED" },
      kind: "transitioned",
    });

    const result = await changeFundingCallGovernanceStatus(
      user([permissionCodes.fundingCallApproveAll]),
      callId,
      { command: "APPROVE", expectedRowVersion: 5 },
      "approve-key",
      "correlation-id",
    );

    expect(validateFundingCallReadiness).toHaveBeenCalledWith(
      pending,
      expect.any(Date),
    );
    expect(result.status).toBe("APPROVED");
  });

  it("passes the required return reason without running readiness", async () => {
    const pending = { ...call, rowVersion: 5, status: "APPROVAL_PENDING" as const };
    vi.mocked(readFundingCallById).mockResolvedValue(pending);
    vi.mocked(changeFundingCallGovernance).mockResolvedValue({
      call: { ...pending, rowVersion: 6, status: "DRAFT" },
      kind: "transitioned",
    });

    await changeFundingCallGovernanceStatus(
      user([permissionCodes.fundingCallReturnAll]),
      callId,
      {
        command: "RETURN_FOR_AMENDMENT",
        expectedRowVersion: 5,
        reason: "Clarify the public guidance.",
      },
      "return-key",
      "correlation-id",
    );

    expect(validateFundingCallReadiness).not.toHaveBeenCalled();
    expect(changeFundingCallGovernance).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "Clarify the public guidance." }),
    );
  });

  it("reports maker-checker and submitter-context failures", async () => {
    const pending = { ...call, rowVersion: 5, status: "APPROVAL_PENDING" as const };
    vi.mocked(readFundingCallById).mockResolvedValue(pending);
    vi.mocked(changeFundingCallGovernance).mockResolvedValueOnce({
      kind: "maker_checker_conflict",
    });

    await expect(changeFundingCallGovernanceStatus(
      user([permissionCodes.fundingCallApproveAll]),
      callId,
      { command: "APPROVE", expectedRowVersion: 5 },
      "approve-key",
      "correlation-id",
    )).rejects.toThrow("creator or last material editor");

    vi.mocked(changeFundingCallGovernance).mockResolvedValueOnce({
      kind: "not_submitter",
    });
    await expect(changeFundingCallGovernanceStatus(
      user([permissionCodes.fundingCallApprovalRequestOwnWithdraw]),
      callId,
      { command: "WITHDRAW_APPROVAL_REQUEST", expectedRowVersion: 5 },
      "withdraw-key",
      "correlation-id",
    )).rejects.toBeInstanceOf(ResourceConflictError);
  });
});
