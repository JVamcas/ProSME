import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import { defaultWorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";
import { evaluateWorkflowActionPolicy } from "@/modules/workflows/application/runtime/WorkflowActionPolicy";
import { describe, expect, it } from "vitest";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";
import { removeWorkflowWithdrawalActions } from "@/modules/workflows/domain/definitions/WorkflowApplicantWithdrawal";
import { isSupportedWorkflowAction } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import { workflowActionTypeItems } from "@/modules/workflows/ui/definitions/WorkflowActionFormSchema";
import { workflowStageFormSchema } from "@/modules/workflows/ui/definitions/WorkflowStageFormSchema";

describe("applicant withdrawal configuration", () => {
  it("blocks direct execution of an immutable historical staff withdrawal action", () => {
    expect(
      evaluateWorkflowActionPolicy(
        {
          capabilities: new Set([permissionCodes.workflowTaskAssignedDecide]),
          status: "active",
        } as unknown as AuthenticatedUser,
        {
          stageStatus: "ACTIVE",
          workflowStatus: "ACTIVE",
          task: {
            assignedToActor: true,
            permissions: defaultWorkflowElementPermissions,
            status: "IN_PROGRESS",
          },
          action: { actionType: "WITHDRAW", enabled: true },
        },
        { conditionsPass: true, configurationValid: true, targetsValid: true },
      ),
    ).toMatchObject({
      available: false,
      reason: "INVALID_CONFIGURATION",
      unavailableReason:
        "Withdrawal is initiated by the applicant through the applicant portal.",
    });
  });

  it("defaults the stage checkbox to enabled and preserves an explicit opt-out", () => {
    const { allowApplicantWithdrawal: omitted, ...stage } =
      referenceWorkflow.stages[0];
    void omitted;
    expect(workflowStageFormSchema.parse(stage).allowApplicantWithdrawal).toBe(
      true,
    );
    expect(
      workflowStageFormSchema.parse({
        ...stage,
        allowApplicantWithdrawal: false,
      }).allowApplicantWithdrawal,
    ).toBe(false);
  });

  it("removes staff withdrawal actions, bindings and routes without changing history", () => {
    const graph = structuredClone(referenceWorkflow);
    const stage = graph.stages[0];
    stage.allowApplicantWithdrawal = false;
    stage.actions.push({
      actionType: "WITHDRAW",
      configuration: {
        allowedStageKeys: [stage.stableKey],
        resubmissionRule: "REOPEN_WITHDRAWN",
      },
      displayOrder: 99,
      enabled: true,
      label: "Withdraw",
      reasonRequired: true,
      stableKey: "OLD_WITHDRAW",
    });
    stage.tasks[0].actionKeys.push("OLD_WITHDRAW");
    graph.transitions.push({
      actionKey: "OLD_WITHDRAW",
      condition: null,
      priority: 99,
      sourceStageKey: stage.stableKey,
      targetStageKeys: [],
      terminalOutcome: "WITHDRAWN",
    });
    const next = removeWorkflowWithdrawalActions(graph);
    expect(next.stages[0].allowApplicantWithdrawal).toBe(false);
    expect(
      next.stages[0].actions.some((action) => action.actionType === "WITHDRAW"),
    ).toBe(false);
    expect(next.stages[0].tasks[0].actionKeys).not.toContain("OLD_WITHDRAW");
    expect(
      next.transitions.some((route) => route.actionKey === "OLD_WITHDRAW"),
    ).toBe(false);
    expect(stage.actions.at(-1)?.actionType).toBe("WITHDRAW");
    expect(stage.tasks[0].actionKeys).toContain("OLD_WITHDRAW");
  });

  it("excludes withdrawal from supported staff actions and editor options", () => {
    expect(isSupportedWorkflowAction("WITHDRAW")).toBe(false);
    expect(workflowActionTypeItems.map((item) => item.value)).not.toContain(
      "WITHDRAW",
    );
  });
});
