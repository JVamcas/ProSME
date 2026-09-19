import { describe, expect, it } from "vitest";

import { workflowTaskSchema } from "@/modules/workflows/api/WorkflowSchemas";

const task = {
  stableKey: "TECHNICAL_REVIEW",
  name: "Technical review",
  description: "Review the application's technical merits.",
  roleId: "79e20de0-3558-4d63-90a4-8c9f5125df07",
  namedUserOverrideId: null,
  assignmentMode: "ROLE" as const,
  reviewerCount: 3,
  requiredCompletionCount: 2,
  quorum: true,
  coiRequired: true,
  displayOrder: 1,
  type: "ASSESSMENT_FORM" as const,
  required: true,
  config: {},
};

describe("WorkflowTaskDefinition", () => {
  it("accepts every configurable Phase 1.4 field", () => {
    expect(workflowTaskSchema.parse(task)).toEqual(task);
  });

  it("accepts each controlled assignment mode", () => {
    expect(workflowTaskSchema.safeParse({
      ...task,
      assignmentMode: "NAMED_USER",
      roleId: null,
      namedUserOverrideId: "79e20de0-3558-4d63-90a4-8c9f5125df08",
      reviewerCount: 1,
      requiredCompletionCount: 1,
      quorum: false,
    }).success).toBe(true);
    expect(workflowTaskSchema.safeParse({
      ...task,
      assignmentMode: "ROUND_ROBIN",
    }).success).toBe(false);
  });

  it("enforces reviewer completion and quorum constraints", () => {
    expect(workflowTaskSchema.safeParse({
      ...task,
      requiredCompletionCount: 4,
    }).success).toBe(false);
    expect(workflowTaskSchema.safeParse({
      ...task,
      reviewerCount: 1,
      requiredCompletionCount: 1,
    }).success).toBe(false);
    expect(workflowTaskSchema.safeParse({
      ...task,
      reviewerCount: 4,
      requiredCompletionCount: 2,
    }).success).toBe(false);
  });
});
