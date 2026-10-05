import type { AuthenticatedUser } from "@/auth/types";
import { describe, expect, it } from "vitest";
import { permissionCodes } from "@/auth/authorization/permissions";
import { workflowProgressTaskView } from "@/modules/workflows/application/runtime/WorkflowProgressTaskView";
import type { ProgressTaskRecord } from "@/modules/workflows/infrastructure/WorkflowProgressRepository";

import { workflowTaskActorFixture } from "../../support/WorkflowTaskServiceFixture";

const actor: AuthenticatedUser = {
  ...workflowTaskActorFixture,
  id: "admin", status: "active", roleCodes: new Set(["reviewer"]),
  capabilities: new Set([permissionCodes.workflowTaskAllRead]),
};
const task: ProgressTaskRecord = {
  id: "task", name: "Decision", taskType: "STAGE_DECISION", status: "PENDING",
  assignedUserId: "reviewer", assignedUserName: "Reviewer", assignedUserEmail: null,
  assignedRoleCode: "reviewer", assignedRoleName: "Reviewer",
  actionedAt: null, dueAt: null, required: true, taskDefinitionId: "definition",
  reviewerCount: 2, reviewRelease: "STAGE_COMPLETED", thresholdSatisfied: false,
  prerequisitesComplete: false, viewPermission: permissionCodes.workflowTaskAssignedRead,
};
const context = {
  index: 0, reviewingDefinitions: new Set<string | null>(),
  workflowStatus: "ACTIVE", stageStatus: "ACTIVE",
};

describe("workflow progress task read access", () => {
  it.each(["ACTIVE", "RETURNED", "COMPLETED"])("allows oversight reads in a %s stage", (stageStatus) => {
    expect(workflowProgressTaskView(actor, task, { ...context, stageStatus }).canOpen).toBe(true);
  });

  it("does not turn a role membership into assignment", () => {
    const assignedReader = { ...actor, capabilities: new Set([permissionCodes.workflowTaskAssignedRead]) };
    expect(workflowProgressTaskView(assignedReader, {
      ...task, assignedUserId: null, prerequisitesComplete: true,
    }, context).canOpen).toBe(false);
  });

  it("continues hiding unreleased peer reviews", () => {
    const result = workflowProgressTaskView(actor, task, {
      ...context, reviewingDefinitions: new Set([task.taskDefinitionId]),
    });
    expect(result).toMatchObject({ canOpen: false, assignedUserName: null, id: "peer-slot-1" });
  });

  it("allows the assignee to open a decision while keeping its blocking reason", () => {
    const result = workflowProgressTaskView({
      ...actor, id: "reviewer",
      capabilities: new Set([permissionCodes.workflowTaskAssignedRead]),
    }, task, context);
    expect(result.canOpen).toBe(true);
    expect(result.blockedReason).toContain("review thresholds");
  });
});
