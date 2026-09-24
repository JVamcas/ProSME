import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock(
  "@/modules/eligibility/application/ServerAuthoritativeEligibilityService",
  () => ({ executeAuthoritativeEligibility: vi.fn() }),
);

import * as route from "@/app/api/admin/tasks/[id]/eligibility-evaluation/route";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { executeAuthoritativeEligibility } from "@/modules/eligibility/application/ServerAuthoritativeEligibilityService";

const taskId = "30000000-0000-4000-8000-000000000001";
const commandKey = "50000000-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveUserFromHeaders).mockResolvedValue({ id: "actor" } as never);
  vi.mocked(executeAuthoritativeEligibility).mockResolvedValue({
    eligible: true,
    evaluationId: "b0000000-0000-4000-8000-000000000001",
    evaluationNumber: 1,
    hardFailureCount: 0,
    manualScreeningRequired: false,
    outcome: "ELIGIBLE",
    rowVersion: 3,
    softFailureCount: 0,
    warningCount: 1,
  });
});

describe("authoritative eligibility execution route", () => {
  it("runs a versioned Screening command for the assigned task", async () => {
    const response = await route.POST(new Request(
      `http://localhost/api/admin/tasks/${taskId}/eligibility-evaluation`,
      {
        body: JSON.stringify({ expectedRowVersion: 2 }),
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": commandKey,
        },
        method: "POST",
      },
    ), { params: Promise.resolve({ id: taskId }) });

    expect(response.status).toBe(200);
    expect(executeAuthoritativeEligibility).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        expectedRowVersion: 2,
        idempotencyKey: commandKey,
        taskId,
      }),
    );
  });
});
