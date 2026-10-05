import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock("@/modules/applications/ServerApplicationReadViewService", () => ({
  getOwnApplicationReadView: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowRfiReadRepository", () => ({
  readApplicationWorkflowRfis: vi.fn(),
  readAssignedApplicationWorkflowRfis: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowTaskRepository", () => ({
  readWorkflowTask: vi.fn(),
}));

import { GET as ownGET } from "@/app/api/applications/[id]/read-view/route";
import { GET as staffGET } from "@/app/api/applications/[id]/information-requests/route";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import { getOwnApplicationReadView } from "@/modules/applications/ServerApplicationReadViewService";
import {
  readApplicationWorkflowRfis,
  readAssignedApplicationWorkflowRfis,
} from "@/modules/workflows/infrastructure/WorkflowRfiReadRepository";

const id = "66666666-6666-4666-8666-666666666661";
const actor: AuthenticatedUser = {
  capabilities: new Set([permissionCodes.workflowTaskAssignedRead]),
  createdAt: new Date(),
  displayName: "Synthetic staff",
  email: "test@example.test",
  id: "61111111-1111-4111-8111-111111111112",
  identitySubject: "test",
  lastLoginAt: null,
  roleCodes: new Set(["test"]),
  status: "active",
  updatedAt: new Date(),
  userType: "staff",
};
const context = { params: Promise.resolve({ id }) };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveUserFromHeaders).mockResolvedValue(actor);
  vi.mocked(getOwnApplicationReadView).mockResolvedValue({
    summary: { id },
  } as never);
  vi.mocked(readAssignedApplicationWorkflowRfis).mockResolvedValue([]);
  vi.mocked(readApplicationWorkflowRfis).mockResolvedValue([]);
});

describe("application detail transports", () => {
  it("forwards the authenticated owner context and an audit correlation to the existing read service", async () => {
    const response = await ownGET(
      new Request("http://localhost/read-view"),
      context,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body.meta.correlationId).toBe(
      response.headers.get("x-correlation-id"),
    );
    expect(getOwnApplicationReadView).toHaveBeenCalledWith(
      actor,
      id,
      body.meta.correlationId,
    );
  });

  it.each([ownGET, staffGET])(
    "rejects malformed record ids before invoking reads",
    async (handler) => {
      const response = await handler(new Request("http://localhost/detail"), {
        params: Promise.resolve({ id: "bad-id" }),
      });
      expect(response.status).toBe(400);
      expect(getOwnApplicationReadView).not.toHaveBeenCalled();
      expect(readApplicationWorkflowRfis).not.toHaveBeenCalled();
      expect(readAssignedApplicationWorkflowRfis).not.toHaveBeenCalled();
    },
  );

  it("returns the existing owner/context mismatch as 404 without exposing a record", async () => {
    vi.mocked(getOwnApplicationReadView).mockRejectedValue(
      new ResourceNotFoundError("application"),
    );
    const response = await ownGET(
      new Request("http://localhost/read-view"),
      context,
    );
    expect(response.status).toBe(404);
    expect(await response.json()).not.toHaveProperty("data");
  });

  it("restricts assigned RFI reads to the actor rather than accepting a browser supplied scope", async () => {
    const response = await staffGET(
      new Request(
        "http://localhost/information-requests?actorId=other&scope=all",
      ),
      context,
    );
    expect(response.status).toBe(200);
    expect(readAssignedApplicationWorkflowRfis).toHaveBeenCalledWith(
      id,
      actor.id,
      { actorId: actor.id, canRead: false, canRespond: false },
    );
    expect(readApplicationWorkflowRfis).not.toHaveBeenCalled();
  });

  it("permits all-scope RFI reads only with the canonical grant", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue({
      ...actor,
      capabilities: new Set([permissionCodes.fundingApplicationAllRead]),
    });
    const response = await staffGET(
      new Request("http://localhost/information-requests"),
      context,
    );
    expect(response.status).toBe(200);
    expect(readApplicationWorkflowRfis).toHaveBeenCalledWith(id, {
      actorId: actor.id,
      canRead: false,
      canRespond: false,
    });
    expect(readAssignedApplicationWorkflowRfis).not.toHaveBeenCalled();
  });

  it.each([null, { ...actor, capabilities: new Set<string>() }])(
    "denies missing authentication or grants before RFI reads",
    async (user) => {
      vi.mocked(resolveUserFromHeaders).mockResolvedValue(user);
      const response = await staffGET(
        new Request("http://localhost/information-requests"),
        context,
      );
      expect([401, 403]).toContain(response.status);
      expect(readAssignedApplicationWorkflowRfis).not.toHaveBeenCalled();
      expect(readApplicationWorkflowRfis).not.toHaveBeenCalled();
    },
  );
});
