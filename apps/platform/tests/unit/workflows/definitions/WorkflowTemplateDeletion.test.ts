import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowDetailsRepository", () => ({
  deleteWorkflowDefinition: vi.fn(),
  updateWorkflowDefinitionDetails: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { deleteWorkflowTemplate } from "@/modules/workflows/application/definitions/ServerWorkflowTemplateService";
import { deleteWorkflowDefinition } from "@/modules/workflows/infrastructure/WorkflowDetailsRepository";

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
  it("permanently deletes the current single-version draft", async () => {
    await expect(
      deleteWorkflowTemplate(
        actor,
        templateId,
        versionId,
        1,
        correlationId,
      ),
    ).resolves.toEqual({ id: templateId });
    expect(deleteWorkflowDefinition).toHaveBeenCalledWith({
      actorId: actor.id,
      correlationId,
      definitionId: templateId,
      expectedRowVersion: 1,
      versionId,
    });
  });

  it("requires workflow update permission", async () => {
    const reader = {
      ...actor,
      capabilities: new Set([permissionCodes.workflowDefinitionRead]),
    };
    await expect(
      deleteWorkflowTemplate(
        reader,
        templateId,
        versionId,
        1,
        correlationId,
      ),
    ).rejects.toThrow("Missing required capability");
    expect(deleteWorkflowDefinition).not.toHaveBeenCalled();
  });

  it("rejects deletion when storage does not find one current draft", async () => {
    vi.mocked(deleteWorkflowDefinition).mockResolvedValue(null);
    await expect(
      deleteWorkflowTemplate(
        actor,
        templateId,
        versionId,
        1,
        correlationId,
      ),
    ).rejects.toThrow("Only a draft workflow template");
  });
});
