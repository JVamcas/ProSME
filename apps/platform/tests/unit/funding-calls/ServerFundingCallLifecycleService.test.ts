import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/funding-calls/infrastructure/FundingCallRepository", () => ({
  readFundingCallById: vi.fn(),
}));
vi.mock("@/modules/funding-calls/infrastructure/FundingCallLifecycleRepository", () => ({
  listPublishedFundingCallsDueToClose: vi.fn(),
  listScheduledFundingCallsDueToOpen: vi.fn(),
  readFundingCallLifecycleReplay: vi.fn(),
  transitionFundingCall: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceConflictError } from "@/lib/resource-errors";
import {
  changeFundingCallLifecycleStatus,
  closeExpiredFundingCalls,
  openScheduledFundingCalls,
} from "@/modules/funding-calls/application/ServerFundingCallLifecycleService";
import {
  listPublishedFundingCallsDueToClose,
  listScheduledFundingCallsDueToOpen,
  readFundingCallLifecycleReplay,
  transitionFundingCall,
} from "@/modules/funding-calls/infrastructure/FundingCallLifecycleRepository";
import { readFundingCallById } from "@/modules/funding-calls/infrastructure/FundingCallRepository";

const actorId = "10000000-0000-4000-8000-000000000001";
const callId = "00000000-0000-4000-8000-000000000042";
const opensAt = new Date("2027-02-01T06:00:00.000Z");
const closesAt = new Date("2027-03-31T15:00:00.000Z");
const call = {
  applicationDuplicatePolicy: "one_per_business" as const,
  closesAt,
  createdAt: new Date("2026-09-20T08:00:00.000Z"),
  createdBy: actorId,
  description: "Growth funding.",
  eligibilityRuleSetVersionId: null,
  eligibilitySummary: null,
  formVersionId: null,
  fundingInstrument: "Grant",
  id: callId,
  maximumGrantAmount: "500000.00",
  minimumGrantAmount: "50000.00",
  opensAt,
  publicContactEmail: null,
  publicContactName: null,
  publicContactPhone: null,
  reference: "SME Fund-2027-01",
  rowVersion: 4,
  slug: "sme-growth-fund-2027",
  status: "LIVE" as const,
  suspendedFromStatus: null,
  thematicArea: "Growth",
  title: "SME Fund Growth Fund 2027",
  totalBudgetEnvelope: "10000000.00",
  updatedAt: new Date("2026-09-20T08:00:00.000Z"),
  updatedBy: actorId,
  workflowTemplateVersionId: null,
};

function user(grants: string[]): AuthenticatedUser {
  return {
    capabilities: new Set(grants),
    createdAt: new Date(),
    displayName: "Lifecycle administrator",
    email: "lifecycle@example.test",
    id: actorId,
    identitySubject: "lifecycle-admin",
    lastLoginAt: null,
    roleCodes: new Set(),
    status: "active",
    updatedAt: new Date(),
    userType: "staff",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readFundingCallLifecycleReplay).mockResolvedValue(null);
  vi.mocked(readFundingCallById).mockResolvedValue(call);
  vi.mocked(listScheduledFundingCallsDueToOpen).mockResolvedValue([]);
  vi.mocked(listPublishedFundingCallsDueToClose).mockResolvedValue([]);
});

describe("funding call exceptional lifecycle", () => {
  it("requires the command-specific permission", async () => {
    await expect(changeFundingCallLifecycleStatus(
      user([permissionCodes.fundingCallPublish]),
      callId,
      { command: "SUSPEND", expectedRowVersion: 4, reason: "Pause" },
      "suspend-key",
      "correlation-id",
    )).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("rejects a command from the wrong state", async () => {
    vi.mocked(readFundingCallById).mockResolvedValue({
      ...call,
      status: "DRAFT",
    });
    await expect(changeFundingCallLifecycleStatus(
      user([permissionCodes.fundingCallSuspend]),
      callId,
      { command: "SUSPEND", expectedRowVersion: 4, reason: "Pause" },
      "suspend-key",
      "correlation-id",
    )).rejects.toBeInstanceOf(ResourceConflictError);
    expect(transitionFundingCall).not.toHaveBeenCalled();
  });

  it("rejects a stale lifecycle command", async () => {
    await expect(changeFundingCallLifecycleStatus(
      user([permissionCodes.fundingCallSuspend]),
      callId,
      { command: "SUSPEND", expectedRowVersion: 3, reason: "Pause" },
      "suspend-key",
      "correlation-id",
    )).rejects.toBeInstanceOf(ResourceConflictError);
    expect(transitionFundingCall).not.toHaveBeenCalled();
  });

  it("records the reason and optimistic version for suspension", async () => {
    vi.mocked(transitionFundingCall).mockResolvedValue({
      call: { ...call, status: "SUSPENDED", suspendedFromStatus: "LIVE" },
      kind: "transitioned",
    });
    const result = await changeFundingCallLifecycleStatus(
      user([permissionCodes.fundingCallSuspend]),
      callId,
      { command: "SUSPEND", expectedRowVersion: 4, reason: "Safety review" },
      "suspend-key",
      "correlation-id",
    );
    expect(transitionFundingCall).toHaveBeenCalledWith(expect.objectContaining({
      actorId,
      command: "SUSPEND",
      expectedRowVersion: 4,
      reason: "Safety review",
    }));
    expect(result.status).toBe("SUSPENDED");
  });
});

describe("funding call lifecycle reconciliation", () => {
  it("opens due calls using a deterministic effective-time key", async () => {
    const now = new Date("2027-02-01T06:00:00.000Z");
    vi.mocked(listScheduledFundingCallsDueToOpen).mockResolvedValue([{
      closesAt,
      id: callId,
      opensAt,
      rowVersion: 4,
    }]);
    vi.mocked(transitionFundingCall).mockResolvedValue({
      call,
      kind: "transitioned",
    });
    await expect(openScheduledFundingCalls(now, 25)).resolves.toEqual({
      attempted: 1,
      failed: 0,
      transitioned: 1,
    });
    expect(transitionFundingCall).toHaveBeenCalledWith(expect.objectContaining({
      command: "OPEN",
      effectiveTime: opensAt,
      idempotencyKey: `funding-call:${callId}:OPEN:${opensAt.toISOString()}`,
      systemActor: "FUNDING_CALL_LIFECYCLE_SCHEDULER",
    }));
  });

  it("closes expired calls and isolates individual failures", async () => {
    const now = new Date(closesAt.getTime() + 1);
    vi.mocked(listPublishedFundingCallsDueToClose).mockResolvedValue([
      { closesAt, id: callId, rowVersion: 4 },
      { closesAt, id: "00000000-0000-4000-8000-000000000043", rowVersion: 2 },
    ]);
    vi.mocked(transitionFundingCall)
      .mockResolvedValueOnce({ call: { ...call, status: "CLOSED" }, kind: "transitioned" })
      .mockRejectedValueOnce(new Error("database unavailable"));
    await expect(closeExpiredFundingCalls(now, 25)).resolves.toEqual({
      attempted: 2,
      failed: 1,
      transitioned: 1,
    });
  });

  it("treats a replayed scheduled command as an idempotent success", async () => {
    vi.mocked(listScheduledFundingCallsDueToOpen).mockResolvedValue([{
      closesAt,
      id: callId,
      opensAt,
      rowVersion: 4,
    }]);
    vi.mocked(transitionFundingCall).mockResolvedValue({
      call,
      kind: "replayed",
    });

    await expect(openScheduledFundingCalls(opensAt)).resolves.toEqual({
      attempted: 1,
      failed: 0,
      transitioned: 0,
    });
  });
});
