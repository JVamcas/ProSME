import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowActionDeletionRepository",
  () => ({
    deleteDraftWorkflowAction: vi.fn(),
  }),
);
vi.mock(
  "@/modules/workflows/application/definitions/ServerWorkflowSupport",
  async () => {
    const { ResourceConflictError, ResourceNotFoundError } =
      await import("@/lib/resource-errors");
    return {
      workflowEditorView: vi.fn(),
      WorkflowConflictError: class extends ResourceConflictError {
        constructor(
          message = "The workflow changed in another session. Reload it and try again.",
        ) {
          super(message);
        }
      },
      WorkflowNotFoundError: ResourceNotFoundError,
    };
  },
);

import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import { deleteWorkflowAction } from "@/modules/workflows/application/definitions/ServerWorkflowActionDeletionService";
import { workflowEditorView } from "@/modules/workflows/application/definitions/ServerWorkflowSupport";
import { deleteDraftWorkflowAction } from "@/modules/workflows/infrastructure/WorkflowActionDeletionRepository";
import { removeWorkflowAction } from "@/modules/workflows/domain/actions/WorkflowActionDeletion";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";

const actor: AuthenticatedUser = {
  id: "actor",
  status: "active",
  capabilities: new Set([permissionCodes.workflowDefinitionUpdate]),
  createdAt: new Date(),
  updatedAt: new Date(),
  displayName: "Workflow administrator",
  email: "workflow@example.test",
  identitySubject: "firebase-workflow-admin",
  lastLoginAt: null,
  roleCodes: new Set(["system_administrator"]),
  userType: "staff",
};
const input = {
  actionKey: "ADVANCE",
  stageKey: "PRE_SCREENING",
  expectedRowVersion: 2,
  versionId: "draft-id",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(deleteDraftWorkflowAction).mockResolvedValue({
    kind: "deleted",
    versionId: input.versionId,
  });
  vi.mocked(workflowEditorView).mockResolvedValue({
    version: { rowVersion: 3 },
  } as never);
});

describe("generic workflow action deletion", () => {
  it("removes selected routes and bindings while preserving same keys on other stages", () => {
    const graph = structuredClone(referenceWorkflow);
    graph.transitions.push({ ...graph.transitions[0], priority: 2 });
    const result = removeWorkflowAction(graph, input.stageKey, input.actionKey);
    expect(result.stages[0].actions).toEqual([]);
    expect(result.stages[0].tasks[0].actionKeys).toEqual([]);
    expect(
      result.transitions.some(
        (route) =>
          route.sourceStageKey === input.stageKey &&
          route.actionKey === input.actionKey,
      ),
    ).toBe(false);
    expect(result.stages.slice(1)).toEqual(graph.stages.slice(1));
    expect(graph.stages[0].actions).toHaveLength(1);
  });

  it.each(["ADVANCE", "OLD_REFER"])(
    "uses targeted deletion for %s without loading a graph first",
    async (actionKey) => {
      await deleteWorkflowAction(
        actor,
        "definition-id",
        { ...input, actionKey },
        "correlation",
      );
      expect(deleteDraftWorkflowAction).toHaveBeenCalledWith({
        ...input,
        actionKey,
        actorId: actor.id,
        definitionId: "definition-id",
        correlationId: "correlation",
      });
      expect(workflowEditorView).toHaveBeenCalledExactlyOnceWith(
        input.versionId,
      );
      expect(
        vi.mocked(deleteDraftWorkflowAction).mock.invocationCallOrder[0],
      ).toBeLessThan(vi.mocked(workflowEditorView).mock.invocationCallOrder[0]);
    },
  );

  it.each([null, { ...actor, capabilities: new Set<string>() }])(
    "denies unauthorized deletion before accessing persistence",
    async (user) => {
      await expect(
        deleteWorkflowAction(user, "definition-id", input, "correlation"),
      ).rejects.toThrow();
      expect(deleteDraftWorkflowAction).not.toHaveBeenCalled();
      expect(workflowEditorView).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["not_found", "not found"],
    ["not_draft", "Only draft versions"],
    ["missing_action", "no longer exists"],
    ["conflict", "another session"],
  ] as const)(
    "reports %s without returning an editor",
    async (kind, message) => {
      vi.mocked(deleteDraftWorkflowAction).mockResolvedValue({ kind });
      await expect(
        deleteWorkflowAction(actor, "definition-id", input, "correlation"),
      ).rejects.toThrow(message);
      expect(workflowEditorView).not.toHaveBeenCalled();
    },
  );
});
