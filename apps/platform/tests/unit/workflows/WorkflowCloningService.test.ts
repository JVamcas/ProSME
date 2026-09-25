import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowRepository", () => ({
  findConfigurationReferences: vi.fn(),
  findDraftByDefinition: vi.fn(),
  listWorkflowAssignmentOptions: vi.fn(),
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
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import { cloneWorkflow } from "@/modules/workflows/application/definitions/ServerWorkflowLifecycleService";
import { cloneWorkflowVersion } from "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository";
import { findWorkflowGraph } from "@/modules/workflows/infrastructure/WorkflowGraphRepository";
import {
  findConfigurationReferences,
  findDraftByDefinition,
  listWorkflowAssignmentOptions,
} from "@/modules/workflows/infrastructure/WorkflowRepository";

import { record, userWith } from "./WorkflowServiceFixtures";

const clonedVersionId = "79e20de0-3558-4d63-90a4-8c9f5125df09";

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(findWorkflowGraph).mockResolvedValue(record);
  vi.mocked(findDraftByDefinition).mockResolvedValue(null);
  vi.mocked(cloneWorkflowVersion).mockResolvedValue(clonedVersionId);
  vi.mocked(findConfigurationReferences).mockResolvedValue({
    formFields: new Map(),
    forms: new Map(),
    formPurposes: new Map(),
    roles: new Set(),
    users: new Map(),
  });
  vi.mocked(listWorkflowAssignmentOptions).mockResolvedValue({
    roles: [],
    users: [],
  });
});

describe("workflow cloning service", () => {
  it("creates a mutable copy of the configured graph", async () => {
    const graph = structuredClone(record.graph);
    graph.stages[0].tasks[0].formBinding = {
      contextFields: [{
        key: "application.requested_amount",
        label: "Requested amount",
        type: "NUMBER",
      }],
      formVersionId: "79e20de0-3558-4d63-90a4-8c9f5125df08",
    };
    graph.stages[0].entryCondition = {
      children: [{
        id: "clone-entry-condition",
        kind: "CONDITION",
        leftOperand: {
          key: "application.user_defined_answer",
          kind: "FIELD",
        },
        operator: basicOperators.EQUALS,
        rightOperand: { kind: "CONSTANT", value: true },
      }],
      combinator: "AND",
      id: "clone-entry-group",
      kind: "GROUP",
    };
    graph.transitions[0].condition = {
      children: [{
        id: "clone-transition-condition",
        kind: "CONDITION",
        leftOperand: {
          key: "stage.pre_screening.USER_DEFINED_RESULT",
          kind: "FIELD",
        },
        operator: basicOperators.EQUALS,
        rightOperand: { kind: "CONSTANT", value: "COMPLETE" },
      }],
      combinator: "AND",
      id: "clone-transition-group",
      kind: "GROUP",
    };
    vi.mocked(findWorkflowGraph).mockResolvedValue({ ...record, graph });

    await cloneWorkflow(
      userWith(permissionCodes.workflowDefinitionUpdate),
      record.definition.id,
      record.version.id,
      "79e20de0-3558-4d63-90a4-8c9f5125df10",
    );

    expect(cloneWorkflowVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        definitionId: record.definition.id,
        sourceVersionId: record.version.id,
        graph: expect.objectContaining({
          stages: expect.arrayContaining([
            expect.objectContaining({
              entryCondition: graph.stages[0].entryCondition,
              tasks: expect.arrayContaining([
                expect.objectContaining({
                  formBinding: graph.stages[0].tasks[0].formBinding,
                }),
              ]),
            }),
          ]),
          transitions: expect.arrayContaining([
            expect.objectContaining({
              condition: graph.transitions[0].condition,
            }),
          ]),
        }),
      }),
    );
  });
});
