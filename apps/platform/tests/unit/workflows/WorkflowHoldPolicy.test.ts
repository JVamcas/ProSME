import { describe, expect, it } from "vitest";
import { permissionCodes } from "@/auth/authorization/permissions";
import {
  assertWorkflowHoldAction,
  authorizedWorkflowHoldScopes,
  authorizedWorkflowHoldResumptions,
  holdScopePermission,
} from "@/modules/workflows/application/runtime/WorkflowHoldPolicy";
import { workflowHoldScopes } from "@/modules/workflows/domain/runtime/WorkflowHold";
import type { ActiveWorkflowHold } from "@/modules/workflows/infrastructure/WorkflowHoldRepository";
import { actor } from "../../support/WorkflowActionAvailabilityFixture";

const context = { task: { id: crypto.randomUUID(), assignedToActor: true } };
const hold: ActiveWorkflowHold = {
  id: crypto.randomUUID(),
  scope: "TASK",
  taskId: context.task.id,
  stageInstanceId: crypto.randomUUID(),
  workflowInstanceId: crypto.randomUUID(),
  heldAt: "2026-10-04T08:00:00Z",
  heldBy: "Reviewer",
  reason: "Awaiting evidence",
  reviewAt: null,
};

describe("workflow hold scope authorization", () => {
  it("does not treat general task processing as hold authority", () => {
    expect(
      authorizedWorkflowHoldScopes(
        actor(permissionCodes.workflowTaskAssignedProcess),
        context,
      ),
    ).toEqual([]);
  });

  it.each(workflowHoldScopes)(
    "requires the dedicated %s hold permission",
    (scope) => {
      expect(
        authorizedWorkflowHoldScopes(
          actor(holdScopePermission(scope)),
          context,
        ),
      ).toEqual([scope]);
      expect(() =>
        assertWorkflowHoldAction(
          actor(),
          context,
          { actionType: "PUT_ON_HOLD", scope },
          [],
        ),
      ).toThrow();
      expect(() =>
        assertWorkflowHoldAction(
          actor(holdScopePermission(scope)),
          context,
          { actionType: "PUT_ON_HOLD", scope },
          [],
        ),
      ).not.toThrow();
    },
  );

  it("requires verified assignment for a task hold", () => {
    const user = actor(permissionCodes.workflowTaskAssignedHold);
    const unassigned = { task: { ...context.task, assignedToActor: false } };
    expect(authorizedWorkflowHoldScopes(user, unassigned)).toEqual([]);
    expect(authorizedWorkflowHoldScopes(user, { task: null })).toEqual([]);
    expect(() =>
      assertWorkflowHoldAction(
        user,
        unassigned,
        { actionType: "PUT_ON_HOLD", scope: "TASK" },
        [],
      ),
    ).toThrow("not assigned");
  });

  it.each(workflowHoldScopes)(
    "resumes %s only with authority for the original scope",
    (scope) => {
      const scopedHold = { ...hold, scope };
      const user = actor(holdScopePermission(scope, true));
      expect(
        authorizedWorkflowHoldResumptions(user, context, [scopedHold]),
      ).toEqual([scopedHold]);
      expect(() =>
        assertWorkflowHoldAction(
          user,
          context,
          { actionType: "RESUME", holdId: hold.id },
          [scopedHold],
        ),
      ).not.toThrow();
      expect(() =>
        assertWorkflowHoldAction(
          actor(holdScopePermission(scope)),
          context,
          { actionType: "RESUME", holdId: hold.id },
          [scopedHold],
        ),
      ).toThrow();
    },
  );

  it("cannot release another reviewer's task or a broader hold", () => {
    const user = actor(permissionCodes.workflowTaskAssignedResume);
    expect(
      authorizedWorkflowHoldResumptions(user, context, [
        { ...hold, taskId: crypto.randomUUID() },
      ]),
    ).toEqual([]);
    expect(
      authorizedWorkflowHoldResumptions(user, context, [
        { ...hold, scope: "APPLICATION" },
      ]),
    ).toEqual([]);
  });

  it("rejects an unrelated hold id, omitted selection and duplicate scope", () => {
    const user = actor(
      permissionCodes.workflowTaskAssignedHold,
      permissionCodes.workflowTaskAssignedResume,
    );
    expect(() =>
      assertWorkflowHoldAction(
        user,
        context,
        { actionType: "RESUME", holdId: crypto.randomUUID() },
        [hold],
      ),
    ).toThrow("does not apply");
    expect(() =>
      assertWorkflowHoldAction(user, context, { actionType: "RESUME" }, [hold]),
    ).toThrow("Choose");
    expect(() =>
      assertWorkflowHoldAction(
        user,
        context,
        { actionType: "PUT_ON_HOLD", scope: "TASK" },
        [hold],
      ),
    ).toThrow("already on hold");
  });
});
