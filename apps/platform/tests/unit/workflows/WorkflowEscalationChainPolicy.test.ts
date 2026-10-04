import { expect, it } from "vitest";
import { permissionCodes } from "@/auth/authorization/permissions";
import { defaultWorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";
import { evaluateWorkflowActionPolicy } from "@/modules/workflows/application/runtime/WorkflowActionPolicy";
import { actor } from "../../support/WorkflowActionAvailabilityFixture";

it.each([true, false])(
  "allows an onward escalation only for the current assignee (%s)",
  (assignedToActor) => {
    const result = evaluateWorkflowActionPolicy(
      actor(permissionCodes.workflowTaskAssignedProcess),
      {
        action: { actionType: "ESCALATE", enabled: true },
        stageStatus: "ACTIVE",
        workflowStatus: "ACTIVE",
        task: {
          status: "IN_PROGRESS",
          permissions: defaultWorkflowElementPermissions,
          assignedToActor,
          activeEscalation: true,
          activeEscalationBlocks: true,
          activeEscalationTargetActor: true,
        },
      },
      { conditionsPass: true, configurationValid: true, targetsValid: true },
    );
    expect(result.available).toBe(assignedToActor);
  },
);
