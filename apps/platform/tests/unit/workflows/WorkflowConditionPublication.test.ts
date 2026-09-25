import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowRepository", () => ({
  findConfigurationReferences: vi.fn(),
  findDraftByDefinition: vi.fn(),
  listWorkflowAssignmentOptions: vi
    .fn()
    .mockResolvedValue({ roles: [], users: [] }),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowGraphRepository", () => ({
  findWorkflowGraph: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository",
  () => ({ cloneWorkflowVersion: vi.fn() }),
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
import {
  publishWorkflow,
} from "@/modules/workflows/application/definitions/ServerWorkflowLifecycleService";
import { WorkflowConflictError } from "@/modules/workflows/application/definitions/ServerWorkflowSupport";
import { findWorkflowGraph } from "@/modules/workflows/infrastructure/WorkflowGraphRepository";
import { publishWorkflowVersion } from "@/modules/workflows/infrastructure/WorkflowLifecycleRepository";
import { findConfigurationReferences } from "@/modules/workflows/infrastructure/WorkflowRepository";
import { record, userWith } from "./WorkflowServiceFixtures";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findConfigurationReferences).mockResolvedValue({
    formFields: new Map(),
    forms: new Map(),
    formPurposes: new Map(),
    roles: new Set(),
    users: new Map(),
  });
});

describe("workflow condition publication", () => {
  it("blocks publication when a configured condition is invalid", async () => {
    const graph = structuredClone(record.graph);
    graph.stages[0].entryCondition = {
      children: [],
      combinator: "AND",
      id: "empty-condition-group",
      kind: "GROUP",
    };
    vi.mocked(findWorkflowGraph).mockResolvedValue({ ...record, graph });

    await expect(
      publishWorkflow(
        userWith(permissionCodes.workflowDefinitionPublish),
        record.definition.id,
        record.version.id,
        1,
        "publish-invalid-condition-key",
        "79e20de0-3558-4d63-90a4-8c9f5125df08",
      ),
    ).rejects.toBeInstanceOf(WorkflowConflictError);
    expect(publishWorkflowVersion).not.toHaveBeenCalled();
  });
});
