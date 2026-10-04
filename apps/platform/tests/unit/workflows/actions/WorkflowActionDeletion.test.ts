import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowTemplateRepository",
  () => ({
    findWorkflowTemplateVersion: vi.fn(),
  }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository",
  () => ({
    replaceWorkflowDraft: vi.fn(),
  }),
);
vi.mock(
  "@/modules/workflows/application/definitions/ServerWorkflowSupport",
  async () => {
    const { ResourceConflictError, ResourceNotFoundError } =
      await import("@/lib/resource-errors");
    return {
      loadWorkflowEditor: vi.fn(),
      workflowEditorView: vi.fn(),
      WorkflowConflictError: ResourceConflictError,
      WorkflowNotFoundError: ResourceNotFoundError,
    };
  },
);

import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import { deleteWorkflowAction } from "@/modules/workflows/application/definitions/ServerWorkflowActionDeletionService";
import {
  loadWorkflowEditor,
  workflowEditorView,
} from "@/modules/workflows/application/definitions/ServerWorkflowSupport";
import { removeWorkflowAction } from "@/modules/workflows/domain/actions/WorkflowActionDeletion";
import { validateWorkflowGraph } from "@/modules/workflows/WorkflowValidation";
import { findWorkflowTemplateVersion } from "@/modules/workflows/infrastructure/WorkflowTemplateRepository";
import { replaceWorkflowDraft } from "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository";
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

function graphWithLegacyActions() {
  const graph = structuredClone(referenceWorkflow);
  graph.stages[0].actions.push({
    stableKey: "OLD_REFER",
    label: "Legacy refer",
    actionType: "REFER",
    configuration: { returnToReferrer: true, sourceTaskBehavior: "BLOCKED" },
    enabled: false,
    reasonRequired: true,
    displayOrder: 2,
  });
  graph.stages[1].actions.push({
    ...graph.stages[0].actions[1],
    stableKey: "ANOTHER_REFER",
    displayOrder: graph.stages[1].actions.length + 1,
  });
  return graph;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findWorkflowTemplateVersion).mockResolvedValue({
    version: { id: input.versionId, status: "DRAFT" },
  } as never);
  vi.mocked(loadWorkflowEditor).mockResolvedValue({
    graph: graphWithLegacyActions(),
  } as never);
  vi.mocked(replaceWorkflowDraft).mockResolvedValue(input.versionId);
  vi.mocked(workflowEditorView).mockResolvedValue({
    version: { rowVersion: 3 },
  } as never);
});

describe("generic workflow action deletion", () => {
  it("removes every selected route and binding while preserving same keys on other stages", () => {
    const graph = structuredClone(referenceWorkflow);
    const stage = graph.stages[0];
    stage.tasks[0].actionKeys = ["ADVANCE"];
    graph.transitions.push({ ...graph.transitions[0], priority: 2 });
    const removed = graph.transitions.filter(
      (route) =>
        route.sourceStageKey === stage.stableKey &&
        route.actionKey === "ADVANCE",
    );

    const result = removeWorkflowAction(graph, stage.stableKey, "ADVANCE");

    expect(result.stages[0].actions).toEqual([]);
    expect(result.stages[0].tasks[0].actionKeys).toEqual([]);
    expect(result.transitions).toEqual(
      graph.transitions.filter((route) => !removed.includes(route)),
    );
    expect(result.stages.slice(1)).toEqual(graph.stages.slice(1));
    expect(graph.stages[0].actions).toHaveLength(1);
  });

  it.each(["ADVANCE", "OLD_REFER"])(
    "deletes %s while unrelated legacy errors remain visible",
    async (actionKey) => {
      const graph = graphWithLegacyActions();
      await deleteWorkflowAction(
        actor,
        "definition-id",
        { ...input, actionKey },
        "correlation",
      );

      const saved = vi.mocked(replaceWorkflowDraft).mock.calls[0][0];
      expect(saved.graph).toEqual(
        removeWorkflowAction(graph, input.stageKey, actionKey),
      );
      expect(saved).toMatchObject({
        actorId: actor.id,
        correlationId: "correlation",
        expectedRowVersion: 2,
      });
      expect(workflowEditorView).toHaveBeenCalledWith(input.versionId);
      expect(validateWorkflowGraph(saved.graph).errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "REMOVED_ACTION_TYPE" }),
        ]),
      );
    },
  );

  it.each([null, { ...actor, capabilities: new Set<string>() }])(
    "denies unauthorized deletion before reading the graph",
    async (user) => {
      await expect(
        deleteWorkflowAction(user, "definition-id", input, "correlation"),
      ).rejects.toThrow();
      expect(findWorkflowTemplateVersion).not.toHaveBeenCalled();
      expect(replaceWorkflowDraft).not.toHaveBeenCalled();
    },
  );

  it("rejects a version belonging to another definition", async () => {
    vi.mocked(findWorkflowTemplateVersion).mockResolvedValue(null);
    await expect(
      deleteWorkflowAction(actor, "other-definition", input, "correlation"),
    ).rejects.toThrow();
    expect(findWorkflowTemplateVersion).toHaveBeenCalledWith(
      "other-definition",
      input.versionId,
    );
    expect(replaceWorkflowDraft).not.toHaveBeenCalled();
  });

  it.each(["PUBLISHED", "RETIRED"])("preserves %s versions", async (status) => {
    vi.mocked(findWorkflowTemplateVersion).mockResolvedValue({
      version: { status },
    } as never);
    await expect(
      deleteWorkflowAction(actor, "definition-id", input, "correlation"),
    ).rejects.toThrow("Only draft versions");
    expect(replaceWorkflowDraft).not.toHaveBeenCalled();
  });

  it.each([{ stageKey: "MISSING" }, { actionKey: "MISSING" }])(
    "rejects missing targets",
    async (target) => {
      await expect(
        deleteWorkflowAction(
          actor,
          "definition-id",
          { ...input, ...target },
          "correlation",
        ),
      ).rejects.toThrow("no longer exists");
      expect(replaceWorkflowDraft).not.toHaveBeenCalled();
    },
  );

  it("reports a stale row version without returning success", async () => {
    vi.mocked(replaceWorkflowDraft).mockResolvedValue(null);
    await expect(
      deleteWorkflowAction(actor, "definition-id", input, "correlation"),
    ).rejects.toThrow();
    expect(workflowEditorView).not.toHaveBeenCalled();
  });
});
