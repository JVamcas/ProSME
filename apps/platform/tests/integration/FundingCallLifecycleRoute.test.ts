import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({ resolveUserFromHeaders: vi.fn() }));
vi.mock("@/modules/funding-calls/application/ServerFundingCallLifecycleService", () => ({
  changeFundingCallLifecycleStatus: vi.fn(),
}));

import { POST } from "@/app/api/admin/funding-calls/[id]/lifecycle/route";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import { changeFundingCallLifecycleStatus } from "@/modules/funding-calls/application/ServerFundingCallLifecycleService";
import { callId, stored, user } from "../support/FundingCallServiceFixture";

const input = { command: "WITHDRAW_FOR_AMENDMENT", expectedRowVersion: 4, reason: "Clarify guidance" };
function request(body = input) {
  return new Request(`http://localhost/api/admin/funding-calls/${callId}/lifecycle`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": "amend-key" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("funding-call amendment route", () => {
  it("validates and delegates the amendment command with actor and concurrency context", async () => {
    const actor = user([permissionCodes.fundingCallWithdrawForAmendmentAll]);
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(actor);
    vi.mocked(changeFundingCallLifecycleStatus).mockResolvedValue({
      ...stored,
      status: "DRAFT",
      closesAt: stored.closesAt.toISOString(),
      opensAt: stored.opensAt.toISOString(),
      createdAt: stored.createdAt.toISOString(),
      updatedAt: stored.updatedAt.toISOString(),
    });
    const response = await POST(request(), { params: Promise.resolve({ id: callId }) });
    expect(response.status).toBe(200);
    expect(changeFundingCallLifecycleStatus).toHaveBeenCalledWith(
      actor, callId, input, "amend-key", expect.any(String),
    );
  });

  it("rejects an empty reason before invoking the service", async () => {
    const response = await POST(request({ ...input, reason: " " }), {
      params: Promise.resolve({ id: callId }),
    });
    expect(response.status).toBe(400);
    expect(changeFundingCallLifecycleStatus).not.toHaveBeenCalled();
  });

  it("returns a forbidden response when amendment permission is denied", async () => {
    vi.mocked(changeFundingCallLifecycleStatus).mockRejectedValue(
      new PermissionDeniedError(permissionCodes.fundingCallWithdrawForAmendmentAll),
    );
    const response = await POST(request(), { params: Promise.resolve({ id: callId }) });
    expect(response.status).toBe(403);
  });
});
