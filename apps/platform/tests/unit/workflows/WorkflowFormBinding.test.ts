import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowRepository", () => ({
  findConfigurationReferences: vi.fn(),
  listWorkflowAssignmentOptions: vi
    .fn()
    .mockResolvedValue({ roles: [], users: [] }),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowGraphRepository", () => ({
  findWorkflowGraph: vi.fn(),
}));

import { findWorkflowGraph } from "@/modules/workflows/infrastructure/WorkflowGraphRepository";
import {
  findConfigurationReferences,
} from "@/modules/workflows/infrastructure/WorkflowRepository";
import {
  workflowEditorView,
} from "@/modules/workflows/application/definitions/ServerWorkflowSupport";
import { actor, record } from "./WorkflowServiceFixtures";

const formVersionId = "45555555-5555-4555-8555-555555555555";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findConfigurationReferences).mockResolvedValue({
    roles: new Set(),
    users: new Map([[actor.id, "active"]]),
  });
});

function recordWithFormBinding() {
  const graph = structuredClone(record.graph);
  graph.stages[0].tasks[0].formBinding = {
    contextFields: [{
      key: "application.requested_amount",
      label: "Requested amount",
      type: "NUMBER",
    }],
    formVersionId,
  };
  return { ...record, graph };
}

describe("workflow task form bindings", () => {
  it("rejects a binding unless the exact form version is published", async () => {
    vi.mocked(findWorkflowGraph).mockResolvedValue(recordWithFormBinding());
    vi.mocked(findConfigurationReferences).mockResolvedValue({
      roles: new Set(),
      users: new Map([[actor.id, "active"]]),
      forms: new Map([[formVersionId, "DRAFT"]]),
    });

    const editor = await workflowEditorView(record.version.id);

    expect(editor.validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "INVALID_FORM_VERSION",
          path: "stages.0.tasks.0.formBinding.formVersionId",
        }),
      ]),
    );
  });

  it("accepts a binding to the exact published form version", async () => {
    vi.mocked(findWorkflowGraph).mockResolvedValue(recordWithFormBinding());
    vi.mocked(findConfigurationReferences).mockResolvedValue({
      roles: new Set(),
      users: new Map([[actor.id, "active"]]),
      forms: new Map([[formVersionId, "PUBLISHED"]]),
    });

    const editor = await workflowEditorView(record.version.id);

    expect(editor.validation.errors).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "INVALID_FORM_VERSION" }),
      ]),
    );
  });
});
