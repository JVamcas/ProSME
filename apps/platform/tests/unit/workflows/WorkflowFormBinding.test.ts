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
    formFields: new Map(),
    forms: new Map(),
    formPurposes: new Map(),
    roles: new Set(),
    users: new Map([[actor.id, "active"]]),
  });
});

function recordWithFormBinding() {
  const graph = structuredClone(record.graph);
  graph.stages[0].tasks[0].config = { formPurpose: "APPLICATION_REVIEW" };
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
      formFields: new Map(),
      roles: new Set(),
      users: new Map([[actor.id, "active"]]),
      forms: new Map([[formVersionId, "DRAFT"]]),
      formPurposes: new Map([[formVersionId, "APPLICATION_REVIEW"]]),
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

  it("rejects form purposes outside the two supported task purposes", async () => {
    const graph = structuredClone(record.graph);
    graph.stages[0].tasks[0].config = { formPurpose: "RFI" };
    vi.mocked(findWorkflowGraph).mockResolvedValue({ ...record, graph });

    const editor = await workflowEditorView(record.version.id);

    expect(editor.validation.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "UNSUPPORTED_TASK_FORM_PURPOSE" }),
    ]));
  });

  it("rejects a published form with the wrong purpose", async () => {
    vi.mocked(findWorkflowGraph).mockResolvedValue(recordWithFormBinding());
    vi.mocked(findConfigurationReferences).mockResolvedValue({
      formFields: new Map(),
      roles: new Set(),
      users: new Map([[actor.id, "active"]]),
      forms: new Map([[formVersionId, "PUBLISHED"]]),
      formPurposes: new Map([[formVersionId, "RFI"]]),
    });

    const editor = await workflowEditorView(record.version.id);

    expect(editor.validation.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "FORM_PURPOSE_MISMATCH" }),
    ]));
  });

  it("ignores an old template binding for an eligibility task", async () => {
    const withBinding = recordWithFormBinding();
    withBinding.graph.stages[0].tasks[0].config = {
      formPurpose: "ELIGIBILITY_VERIFICATION",
    };
    vi.mocked(findWorkflowGraph).mockResolvedValue(withBinding);
    vi.mocked(findConfigurationReferences).mockResolvedValue({
      formFields: new Map(),
      roles: new Set(),
      users: new Map([[actor.id, "active"]]),
      forms: new Map([[formVersionId, "DRAFT"]]),
      formPurposes: new Map([[formVersionId, "APPLICATION_REVIEW"]]),
    });

    const editor = await workflowEditorView(record.version.id);

    expect(editor.validation.errors.map((error) => error.code)).not.toContain(
      "INVALID_FORM_VERSION",
    );
    expect(editor.validation.errors.map((error) => error.code)).not.toContain(
      "FORM_PURPOSE_MISMATCH",
    );
  });

  it("accepts a binding to the exact published form version", async () => {
    vi.mocked(findWorkflowGraph).mockResolvedValue(recordWithFormBinding());
    vi.mocked(findConfigurationReferences).mockResolvedValue({
      formFields: new Map(),
      roles: new Set(),
      users: new Map([[actor.id, "active"]]),
      forms: new Map([[formVersionId, "PUBLISHED"]]),
      formPurposes: new Map([[formVersionId, "APPLICATION_REVIEW"]]),
    });

    const editor = await workflowEditorView(record.version.id);

    expect(editor.validation.errors).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "INVALID_FORM_VERSION" }),
      ]),
    );
  });
});
