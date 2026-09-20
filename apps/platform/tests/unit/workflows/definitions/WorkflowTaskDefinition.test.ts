import { describe, expect, it } from "vitest";

import { workflowTaskSchema } from "@/modules/workflows/api/WorkflowSchemas";
import { defaultWorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";

const task = {
  actionKeys: ["RECOMMEND", "REQUEST_INFORMATION"],
  permissions: defaultWorkflowElementPermissions,
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
  formBinding: null,
};

describe("WorkflowTaskDefinition", () => {
  it("accepts every configurable Phase 1.4 field", () => {
    expect(workflowTaskSchema.parse(task)).toEqual(task);
  });

  it("requires canonical element permissions and controlled visibility", () => {
    expect(workflowTaskSchema.safeParse({
      ...task,
      permissions: {
        ...task.permissions,
        view: "workflow.task.unregistered.read",
      },
    }).success).toBe(false);
    expect(workflowTaskSchema.safeParse({
      ...task,
      permissions: {
        ...task.permissions,
        visibility: "PUBLIC",
      },
    }).success).toBe(false);
    expect(workflowTaskSchema.safeParse({
      ...task,
      permissions: undefined,
    }).success)
      .toBe(false);
  });

  it("stores an exact form version through the task form binding", () => {
    const formVersionId = "45555555-5555-4555-8555-555555555555";

    expect(workflowTaskSchema.parse({
      ...task,
      formBinding: {
        contextFields: [{
          key: "application.requested_amount",
          label: "Requested amount",
          type: "NUMBER",
        }],
        formVersionId,
      },
    }).formBinding).toEqual({
      contextFields: [{
        key: "application.requested_amount",
        label: "Requested amount",
        type: "NUMBER",
      }],
      formVersionId,
    });
  });

  it("rejects the removed flat form version shape", () => {
    expect(workflowTaskSchema.safeParse({
      ...task,
      formVersionId: "45555555-5555-4555-8555-555555555555",
    }).success).toBe(false);
  });

  it("accepts only unique runtime context paths from supported sources", () => {
    const formVersionId = "45555555-5555-4555-8555-555555555555";
    const binding = {
      contextFields: [{
        key: "fundingCall.maximum_amount",
        label: "Maximum amount",
        type: "NUMBER" as const,
      }],
      formVersionId,
    };

    expect(workflowTaskSchema.safeParse({
      ...task,
      formBinding: binding,
    }).success).toBe(true);
    expect(workflowTaskSchema.safeParse({
      ...task,
      formBinding: {
        ...binding,
        contextFields: [{ key: "user.email", label: "Email", type: "TEXT" }],
      },
    }).success).toBe(false);
    expect(workflowTaskSchema.safeParse({
      ...task,
      formBinding: {
        ...binding,
        contextFields: [
          { key: "task.status", label: "Status", type: "TEXT" },
          { key: "task.status", label: "Status again", type: "TEXT" },
        ],
      },
    }).success).toBe(false);
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
