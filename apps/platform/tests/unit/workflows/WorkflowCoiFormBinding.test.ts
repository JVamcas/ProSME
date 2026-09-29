import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowRepository", () => ({
  findConfigurationReferences: vi.fn(),
  listWorkflowAssignmentOptions: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowGraphRepository", () => ({
  findWorkflowGraph: vi.fn(),
}));

import { validateWorkflowConfiguration } from "@/modules/workflows/application/definitions/ServerWorkflowSupport";
import { findConfigurationReferences } from "@/modules/workflows/infrastructure/WorkflowRepository";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";

const coiFormVersionId = "79e20de0-3558-4d63-90a4-8c9f5125df11";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findConfigurationReferences).mockResolvedValue({
    formFields: new Map(),
    formPurposes: new Map(),
    forms: new Map(),
    roles: new Set(),
    users: new Map(),
  });
});

describe("workflow COI form binding", () => {
  it("requires an exact COI form version when the graph contains a COI gate", async () => {
    const graph = {
      ...referenceWorkflow,
      stages: referenceWorkflow.stages.map((stage, index) =>
        index === 2 ? { ...stage, coiFormVersionId: null } : stage
      ),
    };
    const validation = await validateWorkflowConfiguration(graph);

    expect(validation.errors).toContainEqual(expect.objectContaining({
      code: "COI_FORM_VERSION_REQUIRED",
      path: "stages.2.coiFormVersionId",
    }));
  });

  it("accepts only a published version whose purpose is COI", async () => {
    vi.mocked(findConfigurationReferences).mockResolvedValue({
      formFields: new Map(),
      formPurposes: new Map([[coiFormVersionId, "COI"]]),
      forms: new Map([[coiFormVersionId, "PUBLISHED"]]),
      roles: new Set(),
      users: new Map(),
    });

    const validation = await validateWorkflowConfiguration(referenceWorkflow);

    expect(validation.errors).not.toContainEqual(expect.objectContaining({
      code: "COI_FORM_VERSION_REQUIRED",
    }));
    expect(validation.errors).not.toContainEqual(expect.objectContaining({
      code: "INVALID_COI_FORM_VERSION",
    }));
    expect(findConfigurationReferences).toHaveBeenCalledWith(referenceWorkflow);
  });

  it("rejects a draft COI form version", async () => {
    vi.mocked(findConfigurationReferences).mockResolvedValue({
      formFields: new Map(),
      formPurposes: new Map([[coiFormVersionId, "COI"]]),
      forms: new Map([[coiFormVersionId, "DRAFT"]]),
      roles: new Set(),
      users: new Map(),
    });

    const validation = await validateWorkflowConfiguration(referenceWorkflow);

    expect(validation.errors).toContainEqual(expect.objectContaining({
      code: "INVALID_COI_FORM_VERSION",
      path: "stages.2.coiFormVersionId",
    }));
  });
});
