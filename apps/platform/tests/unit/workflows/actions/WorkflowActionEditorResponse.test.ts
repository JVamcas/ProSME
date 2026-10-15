import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowRepository", () => ({
  findConfigurationReferences: vi.fn(),
  listWorkflowAssignmentOptions: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowGraphRepository", () => ({
  findWorkflowGraph: vi.fn(),
}));

import { workflowEditorViewFromRecord } from "@/modules/workflows/application/definitions/ServerWorkflowSupport";
import {
  findConfigurationReferences,
  listWorkflowAssignmentOptions,
} from "@/modules/workflows/infrastructure/WorkflowRepository";
import { findWorkflowGraph } from "@/modules/workflows/infrastructure/WorkflowGraphRepository";
import { workflowActionSaveRecord } from "../../../support/WorkflowActionSaveFixture";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findConfigurationReferences).mockResolvedValue({
    formFields: new Map(),
    formPurposes: new Map(),
    forms: new Map(),
    roles: new Set(),
    users: new Map(),
  });
  vi.mocked(listWorkflowAssignmentOptions).mockResolvedValue({
    roles: [],
    users: [],
  });
});

describe("workflow action editor response", () => {
  it("validates the already loaded graph once without reloading it or assignment options", async () => {
    const record = workflowActionSaveRecord();
    const response = await workflowEditorViewFromRecord(record, false);
    expect(findWorkflowGraph).not.toHaveBeenCalled();
    expect(listWorkflowAssignmentOptions).not.toHaveBeenCalled();
    expect(findConfigurationReferences).toHaveBeenCalledExactlyOnceWith(
      record.graph,
    );
    expect(response).not.toHaveProperty("assignmentOptions");
    expect(response.graph).toEqual(record.graph);
    expect(response.validation).toHaveProperty("valid");
  });
  it("continues supplying assignment options on normal editor reads", async () => {
    const response = await workflowEditorViewFromRecord(
      workflowActionSaveRecord(),
    );
    expect(listWorkflowAssignmentOptions).toHaveBeenCalledOnce();
    expect(response.assignmentOptions).toEqual({ roles: [], users: [] });
  });
});
