import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowTemplateRepository",
  () => ({
    findWorkflowTemplateVersion: vi.fn(),
    findWorkflowTemplateByVersion: vi.fn(),
    listWorkflowTemplateVersions: vi.fn(),
    listWorkflowTemplateAudit: vi.fn(),
  }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository",
  () => ({
    createWorkflowDefinition: vi.fn(),
  }),
);
vi.mock("@/modules/workflows/infrastructure/WorkflowDetailsRepository", () => ({
  updateWorkflowDefinitionDetails: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowLifecycleRepository",
  () => ({
    changeWorkflowTemplateLifecycle: vi.fn(),
    findLifecycleReplay: vi.fn(),
  }),
);
vi.mock("@/modules/workflows/infrastructure/WorkflowGraphRepository", () => ({
  findWorkflowGraph: vi.fn(),
}));
import { permissionCodes } from "@/auth/authorization/permissions/PermissionCodes";
import {
  changeWorkflowTemplateStatus,
  createWorkflowTemplate,
  getWorkflowTemplateAudit,
  getWorkflowTemplateVersion,
  getWorkflowTemplateVersions,
  updateWorkflowTemplateDraft,
} from "@/modules/workflows/application/definitions/ServerWorkflowTemplateService";
import {
  findWorkflowTemplateVersion,
  findWorkflowTemplateByVersion,
  listWorkflowTemplateAudit,
} from "@/modules/workflows/infrastructure/WorkflowTemplateRepository";
import { createWorkflowDefinition } from "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository";
import { updateWorkflowDefinitionDetails } from "@/modules/workflows/infrastructure/WorkflowDetailsRepository";
import {
  changeWorkflowTemplateLifecycle,
  findLifecycleReplay,
} from "@/modules/workflows/infrastructure/WorkflowLifecycleRepository";
import { findWorkflowGraph } from "@/modules/workflows/infrastructure/WorkflowGraphRepository";
import {
  workflowTemplateTransitions,
  type WorkflowTemplateCommand,
} from "@/modules/workflows/domain/definitions/WorkflowTemplate";

import {
  actor,
  template,
  version,
  metadata,
  templateId,
  versionId,
  correlationId,
  input,
  workflowGraphRecord,
} from "./WorkflowTemplateFixtures";
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(findWorkflowTemplateVersion).mockResolvedValue({
    template,
    version,
  });
  vi.mocked(findWorkflowTemplateByVersion).mockResolvedValue(version);
  vi.mocked(createWorkflowDefinition).mockResolvedValue(versionId);
  vi.mocked(changeWorkflowTemplateLifecycle).mockResolvedValue(version);
  vi.mocked(updateWorkflowDefinitionDetails).mockResolvedValue(versionId);
  vi.mocked(findWorkflowGraph).mockResolvedValue(workflowGraphRecord);
});
describe("workflow template storage service", () => {
  it("creates an empty reusable template with draft version 1", async () => {
    const result = await createWorkflowTemplate(actor, metadata, correlationId);
    expect(result.version).toMatchObject({ versionNumber: 1, status: "DRAFT" });
    expect(createWorkflowDefinition).toHaveBeenCalledWith(
      expect.objectContaining({
        ...metadata,
        actorId: actor.id,
        graph: { stages: [], transitions: [] },
      }),
    );
  });

  it("validates metadata before writing", async () => {
    await expect(
      createWorkflowTemplate(actor, { ...metadata, name: " " }, correlationId),
    ).rejects.toThrow();
    expect(createWorkflowDefinition).not.toHaveBeenCalled();
  });

  it("updates a draft using its exact version and concurrency token", async () => {
    await updateWorkflowTemplateDraft(
      actor,
      { ...input, ...metadata },
      correlationId,
    );
    expect(updateWorkflowDefinitionDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        definitionId: templateId,
        versionId,
        expectedRowVersion: 1,
      }),
    );
  });

  it.each(["PENDING_APPROVAL", "APPROVED", "PUBLISHED", "RETIRED"] as const)(
    "rejects edits to %s",
    async (status) => {
      vi.mocked(findWorkflowTemplateVersion).mockResolvedValue({
        template,
        version: { ...version, status },
      });
      await expect(
        updateWorkflowTemplateDraft(
          actor,
          { ...input, ...metadata },
          correlationId,
        ),
      ).rejects.toThrow("Only draft");
      expect(updateWorkflowDefinitionDetails).not.toHaveBeenCalled();
    },
  );

  it("rejects stale draft writes", async () => {
    vi.mocked(updateWorkflowDefinitionDetails).mockResolvedValue(null);
    await expect(
      updateWorkflowTemplateDraft(
        actor,
        { ...input, ...metadata },
        correlationId,
      ),
    ).rejects.toThrow("changed in another session");
  });

  it("keeps retired versions and their audit retrievable", async () => {
    vi.mocked(findWorkflowTemplateVersion).mockResolvedValue({
      template,
      version: { ...version, status: "RETIRED" },
    });
    expect(
      (await getWorkflowTemplateVersion(actor, templateId, versionId)).version
        .status,
    ).toBe("RETIRED");
    await getWorkflowTemplateAudit(actor, templateId, versionId);
    expect(listWorkflowTemplateAudit).toHaveBeenCalledWith(
      templateId,
      versionId,
    );
  });

  it("rejects a version from another template before mutation", async () => {
    vi.mocked(findWorkflowTemplateVersion).mockResolvedValue(null);
    await expect(
      changeWorkflowTemplateStatus(
        actor,
        { ...input, command: "SUBMIT" },
        correlationId,
      ),
    ).rejects.toThrow("not found");
    expect(changeWorkflowTemplateLifecycle).not.toHaveBeenCalled();
  });

  it.each(
    Object.keys(workflowTemplateTransitions) as WorkflowTemplateCommand[],
  )("allows only the configured source status for %s", async (command) => {
    const transition = workflowTemplateTransitions[command];
    vi.mocked(findWorkflowTemplateVersion).mockResolvedValue({
      template,
      version: { ...version, status: transition.from },
    });
    const commandInput = { ...input, command, reason: "Please revise" };
    await changeWorkflowTemplateStatus(actor, commandInput, correlationId);
    expect(changeWorkflowTemplateLifecycle).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: actor.id,
        expectedRowVersion: 1,
        versionId,
      }),
      command,
    );
    vi.mocked(changeWorkflowTemplateLifecycle).mockClear();
    vi.mocked(findWorkflowTemplateVersion).mockResolvedValue({
      template,
      version: { ...version, status: "RETIRED" },
    });
    await expect(
      changeWorkflowTemplateStatus(actor, commandInput, correlationId),
    ).rejects.toThrow();
    expect(changeWorkflowTemplateLifecycle).not.toHaveBeenCalled();
  });

  it("requires a nonblank return reason", async () => {
    await expect(
      changeWorkflowTemplateStatus(
        actor,
        { ...input, command: "RETURN", reason: " " },
        correlationId,
      ),
    ).rejects.toThrow();
    expect(changeWorkflowTemplateLifecycle).not.toHaveBeenCalled();
  });

  it("rejects structurally invalid workflows before approval", async () => {
    vi.mocked(findWorkflowTemplateVersion).mockResolvedValue({
      template,
      version: { ...version, status: "PENDING_APPROVAL" },
    });
    vi.mocked(findWorkflowGraph).mockResolvedValue({
      ...workflowGraphRecord,
      graph: { stages: [], transitions: [] },
    });
    await expect(
      changeWorkflowTemplateStatus(
        actor,
        { ...input, command: "APPROVE" },
        correlationId,
      ),
    ).rejects.toThrow("validation errors");
    expect(changeWorkflowTemplateLifecycle).not.toHaveBeenCalled();
  });

  it("replays the same lifecycle command without writing again", async () => {
    vi.mocked(findLifecycleReplay).mockResolvedValue({
      action: "WORKFLOW_VERSION_PENDING_APPROVAL",
      targetId: versionId,
      after: { command: "SUBMIT", reason: null, rowVersion: 2 },
    });
    await changeWorkflowTemplateStatus(
      actor,
      { ...input, command: "SUBMIT" },
      correlationId,
    );
    expect(changeWorkflowTemplateLifecycle).not.toHaveBeenCalled();
    await expect(
      changeWorkflowTemplateStatus(
        actor,
        { ...input, expectedRowVersion: 2, command: "SUBMIT" },
        correlationId,
      ),
    ).rejects.toThrow("idempotency key");
  });

  it.each(
    Object.keys(workflowTemplateTransitions) as WorkflowTemplateCommand[],
  )(
    "requires explicit permission for %s before accessing storage",
    async (command) => {
      const reader = {
        ...actor,
        capabilities: new Set([permissionCodes.workflowDefinitionRead]),
      };
      await expect(
        changeWorkflowTemplateStatus(
          reader,
          { ...input, command, reason: "Revise" },
          correlationId,
        ),
      ).rejects.toThrow("Missing required capability");
      expect(findWorkflowTemplateVersion).not.toHaveBeenCalled();
      expect(changeWorkflowTemplateLifecycle).not.toHaveBeenCalled();
    },
  );

  it("denies unauthenticated reads and unauthorized writes", async () => {
    await expect(
      getWorkflowTemplateVersion(null, templateId, versionId),
    ).rejects.toThrow("Authentication");
    await expect(getWorkflowTemplateVersions(null, templateId)).rejects.toThrow(
      "Authentication",
    );
    await expect(
      getWorkflowTemplateAudit(null, templateId, versionId),
    ).rejects.toThrow("Authentication");
    const denied = { ...actor, capabilities: new Set<string>() };
    await expect(
      createWorkflowTemplate(denied, metadata, correlationId),
    ).rejects.toThrow("Missing");
    await expect(
      updateWorkflowTemplateDraft(
        denied,
        { ...input, ...metadata },
        correlationId,
      ),
    ).rejects.toThrow("Missing");
    expect(findWorkflowTemplateVersion).not.toHaveBeenCalled();
  });
});
