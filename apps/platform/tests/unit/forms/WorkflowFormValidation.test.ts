import { describe, expect, it } from "vitest";

import { validateWorkflowGraph } from "@/modules/workflows/WorkflowValidation";
import { workflowGraphSchema } from "@/modules/workflows/api/WorkflowSchemas";

const stage = (code: string, sequence: number, initial: boolean) => ({
  stableKey: code,
  initial,
  name: code,
  description: `${code} stage`,
  enabled: true,
  optional: false,
  displayOrder: sequence,
  publicStatusMapping: {
    status: "UNDER_REVIEW" as const,
    label: "Review",
    description: "Review in progress",
  },
  repeatable: false,
  coiGated: false,
  actions: [{
    stableKey: "ADVANCE",
    label: "Advance",
    actionType: "APPROVE_ADVANCE" as const,
    configuration: {},
    enabled: true,
    reasonCodeRequired: false,
    displayOrder: 1,
  }],
  tasks: [{
    actionKeys: ["ADVANCE"],
    assignmentMode: "ROLE" as const,
    roleId: "00000000-0000-0000-0000-000000000001",
    namedUserOverrideId: null,
    stableKey: `${code}_FORM`,
    description: "Complete the configured form.",
    reviewerCount: 1,
    requiredCompletionCount: 1,
    quorum: false,
    coiRequired: false,
    config: {},
    formVersionId: "00000000-0000-0000-0000-000000000002",
    name: "Complete form",
    required: true,
    displayOrder: 1,
    type: "STRUCTURED_FORM" as const,
  }],
});

describe("form-backed workflow validation", () => {
  it("rejects a task binding to an action from outside its stage", () => {
    const first = stage("FIRST", 1, true);
    first.tasks[0].actionKeys = ["UNCONFIGURED_ACTION"];

    expect(workflowGraphSchema.safeParse({
      stages: [first],
      transitions: [],
    }).success).toBe(false);
  });

  it("identifies a draft without transition definitions as structurally invalid", () => {
    const validation = validateWorkflowGraph({
      stages: [stage("FIRST", 1, true), stage("SECOND", 2, false)],
      transitions: [],
    });
    expect(validation.valid).toBe(false);
    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "UNREACHABLE_STAGE" }),
        expect.objectContaining({ code: "TERMINAL_STAGE_WITHOUT_DECISION" }),
      ]),
    );
  });

  it("does not infer workflow routing from stage display order", () => {
    const validation = validateWorkflowGraph({
      stages: [stage("FIRST", 2, true), stage("SECOND", 1, false)],
      transitions: [
        {
          sourceStageKey: "FIRST",
          actionKey: "ADVANCE",
          targetStageKey: "SECOND",
          priority: 1,
        },
        {
          sourceStageKey: "SECOND",
          actionKey: "ADVANCE",
          terminalOutcome: "COMPLETED",
          priority: 1,
        },
      ],
    });
    expect(validation.valid).toBe(true);
  });
});
