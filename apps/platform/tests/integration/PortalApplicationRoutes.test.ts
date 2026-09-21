import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock("@/modules/applications/ServerApplicationService", () => ({
  createApplication: vi.fn(),
  getOwnApplication: vi.fn(),
  listOwnApplications: vi.fn(),
  updateOwnApplication: vi.fn(),
}));

import * as itemRoute from "@/app/api/portal/applications/[id]/route";
import * as listRoute from "@/app/api/portal/applications/route";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceConflictError } from "@/lib/resource-errors";
import {
  createApplication,
  listOwnApplications,
  updateOwnApplication,
} from "@/modules/applications/ServerApplicationService";

const actor = {
  id: "79e20de0-3558-4d63-90a4-8c9f5125df07",
} as AuthenticatedUser;
const applicationId = "99e20de0-3558-4d63-90a4-8c9f5125df07";

function request(path: string, method = "GET", body?: unknown) {
  return new Request(`http://localhost:3008${path}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    method,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveUserFromHeaders).mockResolvedValue(actor);
});

describe("portal application routes", () => {
  it("lists and creates applications through the server service", async () => {
    vi.mocked(listOwnApplications).mockResolvedValue({
      counts: {
        all: 2,
        completed: 0,
        draft: 1,
        submitted: 1,
        underReview: 0,
      },
      items: [],
      nextCursor: null,
      total: 2,
    });
    const listResponse = await listRoute.GET(
      request("/api/portal/applications"),
    );
    expect(listResponse.status).toBe(200);
    expect(listOwnApplications).toHaveBeenCalledWith(actor, { limit: 25 });
    await expect(listResponse.json()).resolves.toMatchObject({
      data: [],
      page: {
        counts: { all: 2, draft: 1, submitted: 1 },
        nextCursor: null,
        total: 2,
      },
    });

    const created = { id: applicationId } as never;
    vi.mocked(createApplication).mockResolvedValue(created);
    const createResponse = await listRoute.POST(
      request("/api/portal/applications", "POST", {
        fundingOpportunityId: "00000000-0000-4000-8000-000000000042",
      }),
    );
    expect(createResponse.status).toBe(200);
    expect(createApplication).toHaveBeenCalledWith(
      actor,
      "00000000-0000-4000-8000-000000000042",
    );
  });

  it("validates section data before continuing", async () => {
    const response = await itemRoute.PATCH(
      request(`/api/portal/applications/${applicationId}`, "PATCH", {
        data: { projectTitle: "Only a title" },
        expectedRowVersion: 1,
        intent: "continue",
        section: "project",
      }),
      { params: Promise.resolve({ id: applicationId }) },
    );
    expect(response.status).toBe(400);
    expect(updateOwnApplication).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
  });

  it("returns a conflict for a stale application update", async () => {
    vi.mocked(updateOwnApplication).mockRejectedValue(
      new ResourceConflictError("Reload the latest draft."),
    );
    const response = await itemRoute.PATCH(
      request(`/api/portal/applications/${applicationId}`, "PATCH", {
        data: {},
        expectedRowVersion: 1,
        intent: "save",
        section: "business",
      }),
      { params: Promise.resolve({ id: applicationId }) },
    );
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "CONFLICT" },
    });
  });
});
