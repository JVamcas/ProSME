import { describe, expect, it } from "vitest";

import {
  workflowGraphSchema,
  workflowStageSchema,
} from "@/modules/workflows/api/WorkflowSchemas";

const stage = {
  stableKey: "TECHNICAL_REVIEW",
  name: "Technical review",
  description: "Review the application's technical merits.",
  enabled: true,
  optional: false,
  displayOrder: 2,
  publicStatusMapping: {
    status: "UNDER_REVIEW" as const,
    label: "Detailed review",
    description: "Your application is undergoing a detailed review.",
  },
  repeatable: true,
  coiGated: true,
  entryCondition: null,
  exitCondition: null,
  initial: true,
  slaHours: null,
  actions: [],
  checklistItems: [],
  documentRequirements: [],
  commentFields: [],
  scoring: null,
  tasks: [],
};

describe("workflow stage definitions", () => {
  it("accepts every configurable Phase 1.3 field", () => {
    expect(workflowStageSchema.parse(stage)).toEqual(stage);
  });

  it("allows a Draft graph to contain stages before later graph concepts", () => {
    expect(
      workflowGraphSchema.parse({ stages: [stage], transitions: [] }),
    ).toEqual({ stages: [stage], transitions: [] });
  });

  it("rejects unstable keys and invalid display order", () => {
    expect(
      workflowStageSchema.safeParse({
        ...stage,
        stableKey: "technical-review",
        displayOrder: 0,
      }).success,
    ).toBe(false);
  });
});
