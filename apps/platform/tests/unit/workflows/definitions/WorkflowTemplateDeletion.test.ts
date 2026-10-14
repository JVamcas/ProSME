import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowTemplateDeletionRepository",
  () => ({
    deleteWorkflowDefinition: vi.fn(),
  }),
);

import { permissionCodes } from "@/auth/authorization/permissions";
import { deleteWorkflowTemplate } from "@/modules/workflows/application/definitions/ServerWorkflowTemplateService";
import { deleteWorkflowDefinition } from "@/modules/workflows/infrastructure/WorkflowTemplateDeletionRepository";

import {
  actor,
  correlationId,
  templateId,
  versionId,
} from "./WorkflowTemplateFixtures";

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(deleteWorkflowDefinition).mockResolvedValue(templateId);
});

describe("workflow template deletion", () => {
  it("permanently deletes the whole draft-only template", async () => {
    await expect(
      deleteWorkflowTemplate(actor, templateId, versionId, 1, correlationId),
    ).resolves.toEqual({ id: templateId });
    expect(deleteWorkflowDefinition).toHaveBeenCalledWith({
      actorId: actor.id,
      correlationId,
      definitionId: templateId,
      expectedRowVersion: 1,
      versionId,
    });
  });

  it("requires the dedicated draft deletion permission", async () => {
    const reader = {
      ...actor,
      capabilities: new Set([permissionCodes.workflowDefinitionRead]),
    };
    await expect(
      deleteWorkflowTemplate(reader, templateId, versionId, 1, correlationId),
    ).rejects.toThrow("Missing required capability");
    expect(deleteWorkflowDefinition).not.toHaveBeenCalled();
  });

  it("does not allow the update permission to authorize deletion", async () => {
    const updater = {
      ...actor,
      capabilities: new Set([permissionCodes.workflowDefinitionUpdate]),
    };
    await expect(
      deleteWorkflowTemplate(updater, templateId, versionId, 1, correlationId),
    ).rejects.toThrow("Missing required capability");
    expect(deleteWorkflowDefinition).not.toHaveBeenCalled();
  });

  it("rejects deletion when storage does not find one current draft", async () => {
    vi.mocked(deleteWorkflowDefinition).mockResolvedValue(null);
    await expect(
      deleteWorkflowTemplate(actor, templateId, versionId, 1, correlationId),
    ).rejects.toThrow("Only an unreferenced template");
  });
});
