import type { AuthenticatedUser } from "@/auth/types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { permissionCodes } from "@/auth/authorization/permissions";
import { workflowProgressTaskView } from "@/modules/workflows/application/runtime/WorkflowProgressTaskView";
import type { ProgressTaskRecord } from "@/modules/workflows/infrastructure/WorkflowProgressRepository";
import { WorkflowStageTaskAssignments } from "@/modules/workflows/ui/WorkflowStageTaskAssignments";

import { workflowTaskActorFixture } from "../../support/WorkflowTaskServiceFixture";

const actor: AuthenticatedUser = {
  ...workflowTaskActorFixture,
  id: "admin",
  status: "active",
  roleCodes: new Set(["reviewer"]),
  capabilities: new Set([permissionCodes.workflowTaskAllRead]),
};
const task: ProgressTaskRecord = {
  id: "task",
  name: "Decision",
  taskType: "STAGE_DECISION",
  status: "PENDING",
  assignedUserId: "reviewer",
  assignedUserName: "Reviewer",
  assignedUserEmail: "reviewer@example.test",
  assignedRoleCode: "reviewer",
  assignedRoleName: "Committee Member",
  actionedAt: null,
  dueAt: null,
  required: true,
  taskDefinitionId: "definition",
  reviewerCount: 2,
  reviewRelease: "STAGE_COMPLETED",
  thresholdSatisfied: false,
  prerequisitesComplete: false,
  viewPermission: permissionCodes.workflowTaskAssignedRead,
};
const context = {
  index: 0,
  reviewingDefinitions: new Set<string | null>(),
  workflowStatus: "ACTIVE",
  stageStatus: "ACTIVE",
};

describe("workflow progress task read access", () => {
  it.each(["ACTIVE", "RETURNED", "COMPLETED"])(
    "allows oversight reads in a %s stage",
    (stageStatus) => {
      const result = workflowProgressTaskView(actor, task, {
        ...context,
        stageStatus,
      });
      expect(result.canOpen).toBe(true);
    },
  );

  it("does not turn a role membership into assignment", () => {
    const assignedReader = {
      ...actor,
      capabilities: new Set([permissionCodes.workflowTaskAssignedRead]),
    };
    const result = workflowProgressTaskView(
      assignedReader,
      {
        ...task,
        assignedUserId: null,
        prerequisitesComplete: true,
      },
      context,
    );
    expect(result.canOpen).toBe(false);
  });

  it.each([
    permissionCodes.workflowTaskAssignedRead,
    permissionCodes.workflowTaskAllRead,
  ])(
    "shows peer identities while denying unreleased review access with %s",
    (permission) => {
      const result = workflowProgressTaskView(
        { ...actor, capabilities: new Set([permission]) },
        task,
        {
          ...context,
          reviewingDefinitions: new Set([task.taskDefinitionId]),
        },
      );
      expect(result).toMatchObject({
        assignedRoleName: "Committee Member",
        assignedUserEmail: "reviewer@example.test",
        assignedUserName: "Reviewer",
        blockedReason:
          "Peer scores and review content are hidden until this stage is completed.",
        canOpen: false,
        id: "peer-slot-1",
      });
      expect(result).not.toHaveProperty("assignedUserId");
      expect(result).not.toHaveProperty("viewPermission");
    },
  );

  it("renders an assigned peer's identity and labels only a vacant slot Unassigned", () => {
    const peerContext = {
      ...context,
      reviewingDefinitions: new Set([task.taskDefinitionId]),
    };
    const peer = workflowProgressTaskView(actor, task, peerContext);
    const vacant = workflowProgressTaskView(
      actor,
      {
        ...task,
        assignedRoleCode: null,
        assignedRoleName: null,
        assignedUserId: null,
        assignedUserName: null,
        assignedUserEmail: null,
      },
      { ...peerContext, index: 1 },
    );
    const markup = renderToStaticMarkup(
      createElement(WorkflowStageTaskAssignments, { tasks: [peer, vacant] }),
    );
    expect(markup).toContain("Reviewer");
    expect(markup).toContain("reviewer@example.test");
    expect(markup).toContain("Committee Member");
    expect(markup.match(/Unassigned/g)).toHaveLength(1);
    expect(markup).not.toContain("/admin/tasks/");
    expect(markup).toContain(
      "Peer scores and review content are hidden until this stage is completed.",
    );
    expect(markup).toContain('aria-disabled="true"');
  });

  it("explains threshold-based peer restrictions and removes the note after release", () => {
    const peerTask: ProgressTaskRecord = {
      ...task,
      taskType: "CONTRIBUTING",
      reviewRelease: "THRESHOLD_MET",
    };
    const peerContext = {
      ...context,
      reviewingDefinitions: new Set([task.taskDefinitionId]),
    };
    const restricted = workflowProgressTaskView(actor, peerTask, peerContext);
    const markup = renderToStaticMarkup(
      createElement(WorkflowStageTaskAssignments, { tasks: [restricted] }),
    );
    expect(restricted.canOpen).toBe(false);
    expect(markup).toContain(
      "Peer scores and review content are hidden until the required review threshold is met.",
    );
    expect(markup).not.toContain("/admin/tasks/");

    const released = workflowProgressTaskView(
      actor,
      { ...peerTask, thresholdSatisfied: true },
      peerContext,
    );
    expect(released.canOpen).toBe(true);
    expect(released.blockedReason).toBeNull();
  });

  it("allows the assignee to open a decision while keeping its blocking reason", () => {
    const result = workflowProgressTaskView(
      {
        ...actor,
        id: "reviewer",
        capabilities: new Set([permissionCodes.workflowTaskAssignedRead]),
      },
      task,
      context,
    );
    expect(result.canOpen).toBe(true);
    expect(result.blockedReason).toContain("review thresholds");
  });
});
