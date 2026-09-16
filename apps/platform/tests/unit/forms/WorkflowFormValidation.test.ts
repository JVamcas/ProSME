import { describe, expect, it } from "vitest";

import { validateWorkflowGraph } from "@/modules/workflows/WorkflowValidation";

const stage = (code: string, sequence: number, initial: boolean) => ({
  applicantDescription: "Review in progress",
  applicantLabel: "Review",
  applicantStatus: "UNDER_REVIEW" as const,
  code,
  initial,
  name: code,
  sequence,
  tasks: [{
    assignmentRoleId: "00000000-0000-0000-0000-000000000001",
    assignmentUserId: null,
    code: `${code}_FORM`,
    config: {},
    formVersionId: "00000000-0000-0000-0000-000000000002",
    name: "Complete form",
    required: true,
    sequence: 1,
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
