import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowQuorumRepository", () => ({
  recordQuorumParticipation: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import {
  recordWorkflowQuorumParticipation,
} from "@/modules/workflows/application/runtime/ServerWorkflowQuorumService";
import {
  recordQuorumParticipation,
} from "@/modules/workflows/infrastructure/WorkflowQuorumRepository";

const input = {
  stageInstanceId: "10000000-0000-4000-8000-000000000001",
  userId: "20000000-0000-4000-8000-000000000001",
  responsibility: "Panel member",
  isChair: false,
  attendance: "PRESENT" as const,
  abstained: false,
};
const actor = {
  id: "30000000-0000-4000-8000-000000000001",
  status: "active",
  capabilities: new Set([permissionCodes.workflowQuorumAllRecord]),
} as unknown as AuthenticatedUser;

beforeEach(() => vi.clearAllMocks());

describe("quorum participation authorization", () => {
  it("records participation with actor attribution", async () => {
    vi.mocked(recordQuorumParticipation).mockResolvedValue(true);
    await expect(recordWorkflowQuorumParticipation(actor, input)).resolves
      .toEqual({ recorded: true });
    expect(recordQuorumParticipation).toHaveBeenCalledWith({
      ...input,
      actorId: actor.id,
    });
  });

  it("denies a user without the canonical quorum permission", async () => {
    await expect(recordWorkflowQuorumParticipation({
      ...actor,
      capabilities: new Set(),
    }, input)).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(recordQuorumParticipation).not.toHaveBeenCalled();
  });

  it("denies a participant outside the active stage context", async () => {
    vi.mocked(recordQuorumParticipation).mockResolvedValue(false);
    await expect(recordWorkflowQuorumParticipation(actor, input)).rejects
      .toBeInstanceOf(ResourceNotFoundError);
  });
});
