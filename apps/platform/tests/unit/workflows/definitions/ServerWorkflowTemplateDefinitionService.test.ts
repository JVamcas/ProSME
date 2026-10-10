import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowTemplateDefinitionRepository",
  () => ({ updateWorkflowTemplateDefinition: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository",
  () => ({ createWorkflowDefinition: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/application/definitions/ServerWorkflowSupport",
  async (original) => ({
    ...(await original<object>()),
    loadWorkflowEditor: vi.fn(),
    workflowEditorView: vi.fn(),
  }),
);
import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import {
  editWorkflowTemplateDefinition,
  copyWorkflowTemplate,
} from "@/modules/workflows/application/definitions/ServerWorkflowTemplateDefinitionService";
import { updateWorkflowTemplateDefinition } from "@/modules/workflows/infrastructure/WorkflowTemplateDefinitionRepository";
import { createWorkflowDefinition } from "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository";
import {
  loadWorkflowEditor,
  workflowEditorView,
  WorkflowConflictError,
  WorkflowNotFoundError,
} from "@/modules/workflows/application/definitions/ServerWorkflowSupport";
import {
  actor,
  templateId,
  versionId,
  metadata,
  correlationId,
  workflowGraphRecord,
} from "./WorkflowTemplateFixtures";

const update = { ...metadata, expectedUpdatedAt: "2026-10-10T10:00:00.000Z" };
const copy = { ...metadata, code: "NEW_TEMPLATE", sourceVersionId: versionId };
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(loadWorkflowEditor).mockResolvedValue(workflowGraphRecord);
});

describe("template definitions and independent copies", () => {
  it("edits definition details without referencing or creating a version", async () => {
    vi.mocked(updateWorkflowTemplateDefinition).mockResolvedValue({
      ...metadata,
      id: templateId,
      updatedAt: update.expectedUpdatedAt,
    });
    await editWorkflowTemplateDefinition(
      actor,
      templateId,
      update,
      correlationId,
    );
    expect(updateWorkflowTemplateDefinition).toHaveBeenCalledWith({
      ...update,
      definitionId: templateId,
      actorId: actor.id,
      correlationId,
    });
    expect(loadWorkflowEditor).not.toHaveBeenCalled();
    expect(createWorkflowDefinition).not.toHaveBeenCalled();
  });

  it("rejects stale definition edits", async () => {
    vi.mocked(updateWorkflowTemplateDefinition).mockResolvedValue(null);
    await expect(
      editWorkflowTemplateDefinition(actor, templateId, update, correlationId),
    ).rejects.toBeInstanceOf(WorkflowConflictError);
  });

  it("copies the exact selected version with fresh entity IDs and exact bindings", async () => {
    vi.mocked(createWorkflowDefinition).mockResolvedValue("new-version");
    await copyWorkflowTemplate(actor, templateId, copy, correlationId);
    expect(loadWorkflowEditor).toHaveBeenCalledWith(versionId);
    const input = vi.mocked(createWorkflowDefinition).mock.calls[0][0];
    expect(input).toMatchObject({
      code: "NEW_TEMPLATE",
      name: metadata.name,
      copiedFrom: { definitionId: templateId, versionId },
    });
    expect(input.graph.stages.map((stage) => stage.id)).toEqual(
      input.graph.stages.map(() => undefined),
    );
    expect(input.graph.stages[0].tasks[0].formBinding).toEqual(
      workflowGraphRecord.graph.stages[0].tasks[0].formBinding,
    );
    expect(workflowEditorView).toHaveBeenCalledWith("new-version");
  });

  it("rejects a source version belonging to a different template", async () => {
    await expect(
      copyWorkflowTemplate(actor, correlationId, copy, correlationId),
    ).rejects.toBeInstanceOf(WorkflowNotFoundError);
    expect(createWorkflowDefinition).not.toHaveBeenCalled();
  });

  it("requires create permission for a new template, and update permission for a definition", async () => {
    const updater = {
      ...actor,
      capabilities: new Set([permissionCodes.workflowDefinitionUpdate]),
    };
    await expect(
      copyWorkflowTemplate(updater, templateId, copy, correlationId),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(loadWorkflowEditor).not.toHaveBeenCalled();
    const creator = {
      ...actor,
      capabilities: new Set([permissionCodes.workflowDefinitionCreate]),
    };
    await expect(
      editWorkflowTemplateDefinition(
        creator,
        templateId,
        update,
        correlationId,
      ),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(updateWorkflowTemplateDefinition).not.toHaveBeenCalled();
  });
});
