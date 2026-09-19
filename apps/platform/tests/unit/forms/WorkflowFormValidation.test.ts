import { describe, expect, it } from "vitest";

import { validateWorkflowGraph } from "@/modules/workflows/WorkflowValidation";

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
  actions: [],
  tasks: [{
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
  it("allows sequential form stages without transition definitions", () => {
    const validation = validateWorkflowGraph({
      stages: [stage("FIRST", 1, true), stage("SECOND", 2, false)],
      transitions: [],
    });
    expect(validation.valid).toBe(true);
  });

  it("requires the initial stage to have the lowest sequence", () => {
    const validation = validateWorkflowGraph({
      stages: [stage("FIRST", 2, true), stage("SECOND", 1, false)],
      transitions: [],
    });
    expect(
      validation.errors.some(
        (error) => error.code === "INITIAL_STAGE_SEQUENCE",
      ),
    ).toBe(true);
  });
});
