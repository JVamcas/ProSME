import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowActionWriteRepository",
  () => ({ saveDraftWorkflowAction: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/application/definitions/ServerWorkflowSupport",
  async (original) => ({
    ...(await original<
      typeof import("@/modules/workflows/application/definitions/ServerWorkflowSupport")
    >()),
    loadWorkflowEditor: vi.fn(),
    workflowEditorViewFromRecord: vi.fn(),
  }),
);

import { permissionCodes } from "@/auth/authorization/permissions";
import {
  AuthenticationRequiredError,
  PermissionDeniedError,
} from "@/auth/authorization/policy";
import { user } from "../../../support/FundingCallServiceFixture";
import {
  workflowActionSaveInput,
  workflowActionSaveRecord,
} from "../../../support/WorkflowActionSaveFixture";
import { saveWorkflowAction } from "@/modules/workflows/application/definitions/ServerWorkflowActionSaveService";
import {
  loadWorkflowEditor,
  workflowEditorViewFromRecord,
} from "@/modules/workflows/application/definitions/ServerWorkflowSupport";
import { saveDraftWorkflowAction } from "@/modules/workflows/infrastructure/WorkflowActionWriteRepository";
import { workflowActionSaveSchema } from "@/modules/workflows/api/WorkflowActionSaveSchema";

const actor = user([permissionCodes.workflowDefinitionUpdate]);
let record = workflowActionSaveRecord();
let input = workflowActionSaveInput(record);
beforeEach(() => {
  vi.clearAllMocks();
  record = workflowActionSaveRecord();
  input = workflowActionSaveInput(record);
  vi.mocked(loadWorkflowEditor).mockResolvedValue(record);
  vi.mocked(saveDraftWorkflowAction).mockResolvedValue({
    action: input.action as typeof input.action & { id: string },
    routes: input.routes,
    rowVersion: 8,
  });
  vi.mocked(workflowEditorViewFromRecord).mockResolvedValue({
    version: { rowVersion: 8 },
  } as never);
});
const save = () =>
  saveWorkflowAction(actor, record.definition.id, input, "correlation");

describe("targeted workflow action save", () => {
  it("writes the selected action and reuses the graph without a second editor read", async () => {
    expect(workflowActionSaveSchema.safeParse(input).success).toBe(true);
    await save();
    expect(loadWorkflowEditor).toHaveBeenCalledExactlyOnceWith(input.versionId);
    expect(saveDraftWorkflowAction).toHaveBeenCalledWith(
      expect.objectContaining({
        definitionId: record.definition.id,
        expectedRowVersion: 7,
        action: input.action,
        stage: record.graph.stages[0],
        bindingsChanged: false,
      }),
    );
    const [updated, includeOptions] = vi.mocked(workflowEditorViewFromRecord)
      .mock.calls[0];
    expect(includeOptions).toBe(false);
    expect(updated.version.rowVersion).toBe(8);
    expect(updated.graph.stages[0].actions[0].label).toBe("Updated action");
    expect(updated.graph.stages.slice(1)).toEqual(record.graph.stages.slice(1));
  });

  it("preserves unrelated task bindings even when other decision actions are unbound", async () => {
    const stage = record.graph.stages[0];
    stage.actions.push({
      ...stage.actions[0],
      id: undefined,
      stableKey: "OTHER_DECISION",
      displayOrder: 2,
    });
    await save();
    const [updated] = vi.mocked(workflowEditorViewFromRecord).mock.calls[0];
    expect(updated.graph.stages[0].tasks[0].actionKeys).toEqual(
      stage.tasks[0].actionKeys,
    );
  });

  it("creates common actions on all stage tasks using the shared binding policy", async () => {
    input.actionKey = null;
    input.action = {
      stableKey: "HOLD",
      label: "Hold",
      displayOrder: 2,
      enabled: true,
      reasonRequired: true,
      actionType: "PUT_ON_HOLD",
      configuration: { scope: "STAGE", reviewDateRequired: true },
    };
    input.taskStableKeys = [];
    input.routes = [];
    await save();
    expect(saveDraftWorkflowAction).toHaveBeenCalledWith(
      expect.objectContaining({
        previous: undefined,
        bindingsChanged: true,
        taskIds: record.graph.stages[0].tasks.map((task) => task.id),
      }),
    );
  });

  it.each([null, user([])])(
    "denies unauthorized saves before reading",
    async (actor) => {
      await expect(
        saveWorkflowAction(actor, record.definition.id, input, "correlation"),
      ).rejects.toBeInstanceOf(
        actor ? PermissionDeniedError : AuthenticationRequiredError,
      );
      expect(loadWorkflowEditor).not.toHaveBeenCalled();
      expect(saveDraftWorkflowAction).not.toHaveBeenCalled();
    },
  );

  it.each([
    "definition",
    "published",
    "stale",
    "stage",
    "action",
    "actionId",
    "key",
    "task",
    "route",
    "routeId",
    "target",
    "priority",
  ])("rejects mismatched %s context before writing", async (mismatch) => {
    if (mismatch === "definition") record.definition.id = record.version.id;
    if (mismatch === "published")
      Object.assign(record.version, { status: "PUBLISHED" });
    if (mismatch === "stale") input.expectedRowVersion++;
    if (mismatch === "stage") input.stageKey = "MISSING";
    if (mismatch === "action") input.actionKey = "MISSING";
    if (mismatch === "actionId")
      input.action.id = record.graph.stages[1].actions[0].id;
    if (mismatch === "key") input.action.stableKey = "RENAMED";
    if (mismatch === "task")
      input.taskStableKeys = [record.graph.stages[1].tasks[0].stableKey];
    if (mismatch === "route")
      input.routes = [{ ...input.routes[0], sourceStageKey: "OTHER" }];
    if (mismatch === "routeId")
      input.routes = [
        { ...input.routes[0], id: record.graph.transitions[1].id },
      ];
    if (mismatch === "target")
      input.routes = [{ ...input.routes[0], targetStageKeys: ["MISSING"] }];
    if (mismatch === "priority")
      input.routes = [input.routes[0], { ...input.routes[0], id: undefined }];
    const definitionId =
      mismatch === "definition" ? "original-definition" : record.definition.id;
    await expect(
      saveWorkflowAction(actor, definitionId, input, "correlation"),
    ).rejects.toThrow();
    expect(saveDraftWorkflowAction).not.toHaveBeenCalled();
  });

  it("rejects a revision changed during the write without returning a stale editor", async () => {
    vi.mocked(saveDraftWorkflowAction).mockResolvedValue(null);
    await expect(save()).rejects.toThrow("another session");
    expect(workflowEditorViewFromRecord).not.toHaveBeenCalled();
  });
});
