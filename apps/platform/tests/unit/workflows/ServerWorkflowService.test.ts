import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowRepository", () => ({
  findConfigurationReferences: vi.fn(),
  findDraftByDefinition: vi.fn(),
  findLatestWorkflowVersionId: vi.fn(),
  listPublishedWorkflowVersions: vi.fn(),
  listWorkflowAssignmentOptions: vi
    .fn()
    .mockResolvedValue({ roles: [], users: [] }),
  listWorkflowDefinitions: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowGraphRepository", () => ({
  findWorkflowGraph: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository",
  () => ({
    cloneWorkflowVersion: vi.fn(),
    createWorkflowDefinition: vi.fn(),
    replaceWorkflowDraft: vi.fn(),
  }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowLifecycleRepository",
  () => ({
    findLifecycleReplay: vi.fn(),
    publishWorkflowVersion: vi.fn(),
    retireWorkflowVersion: vi.fn(),
  }),
);
import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import { publishWorkflowVersion } from "@/modules/workflows/infrastructure/WorkflowLifecycleRepository";
import { findWorkflowGraph } from "@/modules/workflows/infrastructure/WorkflowGraphRepository";
import { findConfigurationReferences } from "@/modules/workflows/infrastructure/WorkflowRepository";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";
import {
  publishWorkflow,
  retireWorkflow,
} from "@/modules/workflows/application/definitions/ServerWorkflowLifecycleService";
import {
  getWorkflowDefinitions,
  updateWorkflowDraft,
  WorkflowConflictError,
} from "@/modules/workflows/application/definitions/ServerWorkflowService";
import { workflowEditorView } from "@/modules/workflows/application/definitions/ServerWorkflowSupport";
import { actor, record, userWith } from "./WorkflowServiceFixtures";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findConfigurationReferences).mockResolvedValue({
    formFields: new Map(),
    forms: new Map(),
    formPurposes: new Map(),
    roles: new Set(),
    users: new Map([[actor.id, "active"]]),
  });
});
describe("workflow service authorization and lifecycle", () => {
  it("rejects workflow reads without the explicit capability", async () => {
    await expect(getWorkflowDefinitions(userWith())).rejects.toBeInstanceOf(
      PermissionDeniedError,
    );
  });

  it("checks update capability before resolving a mutable draft", async () => {
    await expect(
      updateWorkflowDraft(
        userWith(),
        "definition-id",
        { expectedRowVersion: 1, graph: referenceWorkflow },
        "correlation-id",
      ),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("rejects retirement without the explicit lifecycle capability", async () => {
    await expect(
      retireWorkflow(
        userWith(permissionCodes.workflowDefinitionRead),
        record.definition.id,
        record.version.id,
        2,
        "retire-key",
        "correlation-id",
      ),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it.each(["DRAFT", "APPROVED"] as const)(
    "publishes a %s version with optimistic version and idempotency data",
    async (status) => {
      vi.mocked(findConfigurationReferences).mockResolvedValue({
        formFields: new Map(),
        forms: new Map([[referenceWorkflow.stages[2].coiFormVersionId!, "PUBLISHED"]]),
        formPurposes: new Map([[referenceWorkflow.stages[2].coiFormVersionId!, "COI"]]),
        roles: new Set(),
        users: new Map([[actor.id, "active"]]),
      });
      vi.mocked(findWorkflowGraph).mockResolvedValue({
        ...record,
        version: { ...record.version, status },
      });
      vi.mocked(publishWorkflowVersion).mockResolvedValue({
        ...record.version,
        status: "PUBLISHED",
      });
      const result = await publishWorkflow(
        userWith(permissionCodes.workflowDefinitionPublish),
        record.definition.id,
        record.version.id,
        1,
        "publish-key",
        "79e20de0-3558-4d63-90a4-8c9f5125df08",
      );
      expect(result.version.id).toBe(record.version.id);
      expect(publishWorkflowVersion).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedRowVersion: 1,
          idempotencyKey: "publish-key",
          versionId: record.version.id,
        }),
      );
    },
  );

  it("does not publish an invalid graph", async () => {
    vi.mocked(findWorkflowGraph).mockResolvedValue({
      ...record,
      graph: { stages: [referenceWorkflow.stages[0]], transitions: [] },
    });
    const publication = publishWorkflow(
        userWith(permissionCodes.workflowDefinitionPublish),
        record.definition.id,
        record.version.id,
        1,
        "publish-key",
        "79e20de0-3558-4d63-90a4-8c9f5125df08",
      );
    await expect(publication).rejects.toBeInstanceOf(WorkflowConflictError);
    await expect(publication).rejects.toThrow(
      /Workflow cannot be published because it has \d+ validation errors?:/,
    );
    expect(publishWorkflowVersion).not.toHaveBeenCalled();
  });

  it("rejects an escalation target that is not an active role", async () => {
    const graph = structuredClone(record.graph);
    graph.stages[0].actions = [
      {
        stableKey: "ESCALATE_REVIEW",
        label: "Escalate review",
        actionType: "ESCALATE",
        enabled: true,
        reasonRequired: false,
        displayOrder: 1,
        configuration: {
          blockUntilResolved: true,
          responsibility: "SHARE",
          targetType: "ROLE",
          targetId: "79e20de0-3558-4d63-90a4-8c9f5125df09",
          trigger: "SLA_BREACH",
        },
      },
    ];
    vi.mocked(findWorkflowGraph).mockResolvedValue({ ...record, graph });

    const editor = await workflowEditorView(record.version.id);

    expect(editor.validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "UNKNOWN_ESCALATION_ROLE" }),
      ]),
    );
  });
});
