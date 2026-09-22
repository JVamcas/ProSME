import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/funding-calls/infrastructure/FundingCallRepository", () => ({
  readFundingCallById: vi.fn(),
}));
vi.mock("@/modules/funding-calls/infrastructure/FundingCallLifecycleRepository", () => ({
  transitionFundingCall: vi.fn(),
}));
vi.mock("@/modules/funding-calls/application/ServerFundingCallReadinessService", () => ({
  validateFundingCallReadiness: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  publishFundingCall,
} from "@/modules/funding-calls/application/ServerFundingCallService";
import { validateFundingCallReadiness } from "@/modules/funding-calls/application/ServerFundingCallReadinessService";
import { transitionFundingCall } from "@/modules/funding-calls/infrastructure/FundingCallLifecycleRepository";
import { readFundingCallById } from "@/modules/funding-calls/infrastructure/FundingCallRepository";

const actorId = "10000000-0000-4000-8000-000000000001";
const callId = "00000000-0000-4000-8000-000000000042";
const formVersionId = "20000000-0000-4000-8000-000000000001";
const eligibilityRuleSetVersionId = "30000000-0000-4000-8000-000000000001";
const workflowTemplateVersionId = "40000000-0000-4000-8000-000000000001";
const call = {
  closesAt: new Date("2027-03-31T15:00:00.000Z"),
  createdAt: new Date("2026-09-20T08:00:00.000Z"),
  createdBy: actorId,
  description: "Growth funding for qualifying SMEs.",
  eligibilityRuleSetVersionId,
  eligibilitySummary: null,
  formVersionId,
  fundingInstrument: "Grant",
  id: callId,
  maximumGrantAmount: "500000.00",
  minimumGrantAmount: "50000.00",
  opensAt: new Date("2027-02-01T06:00:00.000Z"),
  publicContactEmail: null,
  publicContactName: null,
  publicContactPhone: null,
  reference: "SME-2027-01",
  rowVersion: 1,
  slug: "sme-growth-fund-2027",
  status: "APPROVED" as const,
  suspendedFromStatus: null,
  thematicArea: "Business growth",
  title: "SME Growth Fund 2027",
  totalBudgetEnvelope: "10000000.00",
  updatedAt: new Date("2026-09-20T08:00:00.000Z"),
  updatedBy: actorId,
  workflowTemplateVersionId,
};

function publisher(): AuthenticatedUser {
  return {
    capabilities: new Set([permissionCodes.fundingCallPublish]),
    createdAt: new Date(),
    displayName: "Funding publisher",
    email: "publisher@example.test",
    id: actorId,
    identitySubject: "publisher-subject",
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
    rowVersion: 1,
  });
});

describe("funding call publication", () => {
  it("denies publication without the publish permission", async () => {
    await expect(publishFundingCall(
      { ...publisher(), capabilities: new Set() },
      callId,
      { expectedRowVersion: 1 },
      "publish-key",
      "correlation-id",
    )).rejects.toBeInstanceOf(PermissionDeniedError);

    expect(transitionFundingCall).not.toHaveBeenCalled();
  });

  it("publishes only after rerunning readiness validation", async () => {
    vi.mocked(transitionFundingCall).mockResolvedValue({
      call: {
        ...call,
        rowVersion: 2,
        status: "SCHEDULED",
      },
      kind: "transitioned",
    });

    const result = await publishFundingCall(
      publisher(),
      callId,
      { expectedRowVersion: 1 },
      "publish-key",
      "correlation-id",
    );

    expect(validateFundingCallReadiness).toHaveBeenCalledWith(
      call,
      expect.any(Date),
    );
    expect(transitionFundingCall).toHaveBeenCalledWith({
      actorId,
      command: "PUBLISH",
      correlationId: "correlation-id",
      expectedRowVersion: 1,
      fundingCallId: callId,
      idempotencyKey: "publish-key",
      now: expect.any(Date),
    });
    expect(result.status).toBe("SCHEDULED");
  });

  it("does not publish when current readiness validation fails", async () => {
    vi.mocked(validateFundingCallReadiness).mockResolvedValue({
      checkedAt: "2026-09-22T00:00:00.000Z",
      fundingCallId: callId,
      issues: [{
        code: "FORM_VERSION_NOT_PUBLISHED",
        location: "formVersionId",
        message: "The selected application form version is not published.",
        owner: { id: formVersionId, kind: "FORM_VERSION" },
      }],
      ready: false,
      rowVersion: 1,
    });

    await expect(publishFundingCall(
      publisher(),
      callId,
      { expectedRowVersion: 1 },
      "publish-key",
      "correlation-id",
    )).rejects.toThrow("FORM_VERSION_NOT_PUBLISHED");

    expect(transitionFundingCall).not.toHaveBeenCalled();
  });
});
