import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowTemplateRepository", () => ({
  findWorkflowTemplateVersion: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowRepository", () => ({
  findDraftByDefinition: vi.fn(),
  findLatestWorkflowVersionId: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowDetailsRepository", () => ({}));
vi.mock("@/modules/workflows/application/definitions/ServerWorkflowSupport", () => ({
  WorkflowNotFoundError: class WorkflowNotFoundError extends Error {},
  WorkflowConflictError: class WorkflowConflictError extends Error {},
  workflowEditorView: vi.fn(),
}));

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import { GET } from "@/app/api/admin/workflow-definitions/[id]/draft/route";
import { findWorkflowTemplateVersion } from "@/modules/workflows/infrastructure/WorkflowTemplateRepository";
import { findDraftByDefinition } from "@/modules/workflows/infrastructure/WorkflowRepository";
import { getWorkflowEditor, WorkflowNotFoundError } from "@/modules/workflows/application/definitions/ServerWorkflowService";
import { workflowEditorView } from "@/modules/workflows/application/definitions/ServerWorkflowSupport";
import { userWith } from "../WorkflowServiceFixtures";

const templateId = "41111111-1111-4111-8111-111111111111";
const versionId = "43333333-3333-4333-8333-333333333333";
const reader = userWith(permissionCodes.workflowDefinitionRead);

beforeEach(() => vi.resetAllMocks());

describe("workflow version navigation", () => {
  it("loads the selected historical version instead of the current draft", async () => {
    vi.mocked(findWorkflowTemplateVersion).mockResolvedValue({} as never);
    await getWorkflowEditor(reader, templateId, versionId);
    expect(findWorkflowTemplateVersion).toHaveBeenCalledWith(templateId, versionId);
    expect(workflowEditorView).toHaveBeenCalledWith(versionId);
    expect(findDraftByDefinition).not.toHaveBeenCalled();
  });

  it("rejects a missing version or a version from another template", async () => {
    vi.mocked(findWorkflowTemplateVersion).mockResolvedValue(null);
    await expect(getWorkflowEditor(reader, templateId, versionId))
      .rejects.toBeInstanceOf(WorkflowNotFoundError);
    expect(workflowEditorView).not.toHaveBeenCalled();
    expect(findDraftByDefinition).not.toHaveBeenCalled();
  });

  it("checks read permission before looking up a version", async () => {
    await expect(getWorkflowEditor(userWith(), templateId, versionId))
      .rejects.toBeInstanceOf(PermissionDeniedError);
    expect(findWorkflowTemplateVersion).not.toHaveBeenCalled();
  });

  it("preserves draft selection when no version is requested", async () => {
    vi.mocked(findDraftByDefinition).mockResolvedValue("draft-id");
    await getWorkflowEditor(reader, templateId);
    expect(workflowEditorView).toHaveBeenCalledWith("draft-id");
    expect(findWorkflowTemplateVersion).not.toHaveBeenCalled();
  });

  it("passes the validated version query from the protected route", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(reader);
    vi.mocked(findWorkflowTemplateVersion).mockResolvedValue({} as never);
    vi.mocked(workflowEditorView).mockResolvedValue({ version: { id: versionId } } as never);
    const response = await GET(
      new Request(`http://localhost/api/admin/workflow-definitions/${templateId}/draft?versionId=${versionId}`),
      { params: Promise.resolve({ id: templateId }) },
    );
    expect(response.status).toBe(200);
    expect(workflowEditorView).toHaveBeenCalledWith(versionId);
  });

  it("rejects malformed version query values before reading data", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(reader);
    const response = await GET(
      new Request(`http://localhost/api/admin/workflow-definitions/${templateId}/draft?versionId=invalid`),
      { params: Promise.resolve({ id: templateId }) },
    );
    expect(response.status).toBe(400);
    expect(findWorkflowTemplateVersion).not.toHaveBeenCalled();
  });
});
