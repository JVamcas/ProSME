import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowCoiReviewRepository",
  () => ({
    readPendingWorkflowCoiReview: vi.fn(),
    readPendingWorkflowCoiReviews: vi.fn(),
  }),
);

import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import {
  getPendingWorkflowCoiReview,
  getPendingWorkflowCoiReviews,
} from "@/modules/workflows/application/runtime/ServerWorkflowCoiReviewService";
import {
  readPendingWorkflowCoiReview,
  readPendingWorkflowCoiReviews,
} from "@/modules/workflows/infrastructure/WorkflowCoiReviewRepository";

const actor: AuthenticatedUser = {
  capabilities: new Set([permissionCodes.workflowCoiAllReview]),
  createdAt: new Date(),
  displayName: "Independent reviewer",
  email: "reviewer@example.test",
  id: "11111111-1111-4111-8111-111111111111",
  identitySubject: "reviewer",
  lastLoginAt: null,
  roleCodes: new Set(["programme_officer"]),
  status: "active",
  updatedAt: new Date(),
  userType: "staff",
};

beforeEach(() => vi.clearAllMocks());

describe("workflow COI review service", () => {
  it("scopes the queue to the signed-in reviewer", async () => {
    vi.mocked(readPendingWorkflowCoiReviews).mockResolvedValue({
      items: [],
      total: 0,
    });
    await getPendingWorkflowCoiReviews(actor, { page: 1, pageSize: 25 });
    expect(readPendingWorkflowCoiReviews).toHaveBeenCalledWith(actor.id, {
      page: 1,
      pageSize: 25,
    });
  });

  it("requires the independent-review permission", async () => {
    const user = { ...actor, capabilities: new Set<string>() };
    await expect(
      getPendingWorkflowCoiReviews(user, {
        page: 1,
        pageSize: 25,
      }),
    ).rejects.toThrow();
    expect(readPendingWorkflowCoiReviews).not.toHaveBeenCalled();
  });

  it("does not expose a detail rejected by independent-review scope", async () => {
    vi.mocked(readPendingWorkflowCoiReview).mockResolvedValue(null);
    await expect(
      getPendingWorkflowCoiReview(
        actor,
        "22222222-2222-4222-8222-222222222222",
      ),
    ).rejects.toThrow("pending COI disclosure");
  });
});
