import { describe, expect, it } from "vitest";
import type { WorkflowTaskAction } from "@/modules/work-queue/TaskTypes";
import { emptyWorkflowActionInputMetadata } from "@/modules/workflows/domain/actions/WorkflowActionAvailability";
import { workflowActionInputSchema } from "@/modules/workflows/domain/actions/WorkflowActionExecution";
import {
  actionFormDefaults,
  actionFormSchema,
  actionInput,
} from "@/modules/workflows/ui/tasks/WorkflowTaskActionForm";

function action(required = false): WorkflowTaskAction {
  return {
    actionType: "PUT_ON_HOLD",
    available: true,
    key: "HOLD",
    label: "Put on hold",
    presentation: { displayOrder: 1, variant: "yellow" },
    runtimeVersion: 1,
    unavailableReason: null,
    requiredInput: {
      ...emptyWorkflowActionInputMetadata,
      holdScopes: ["TASK", "STAGE", "APPLICATION"],
      reviewDate: { required },
    },
  };
}

describe("workflow hold form", () => {
  it("defaults to the task scope and submits an optional date and time as UTC", () => {
    const hold = action();
    expect(actionFormDefaults(hold).holdScope).toBe("TASK");
    const values = actionFormSchema(hold).parse({
      ...actionFormDefaults(hold),
      reviewDate: "2026-11-15T14:30",
    });
    expect(actionInput(hold, values)).toEqual({
      actionType: "PUT_ON_HOLD",
      scope: "TASK",
      reviewDate: new Date("2026-11-15T14:30").toISOString(),
    });
  });

  it.each(["2026-11-15", "2026-02-30T14:30", "2026-11-15T25:00"])(
    "rejects an incomplete or invalid date and time: %s",
    (reviewDate) => {
      const hold = action();
      expect(
        actionFormSchema(hold).safeParse({
          ...actionFormDefaults(hold),
          reviewDate,
        }).success,
      ).toBe(false);
    },
  );

  it.each([
    ["2026-11-15T12:30:00.000Z", true],
    ["2026-11-15T14:30:00+02:00", true],
    ["2026-11-15", true],
    ["2026-11-15T14:30", false],
    ["2026-02-30T14:30:00Z", false],
    ["2026-11-15T25:00:00Z", false],
  ])("validates the transport review timestamp %s", (reviewDate, valid) => {
    expect(
      workflowActionInputSchema.safeParse({
        actionType: "PUT_ON_HOLD",
        scope: "TASK",
        reviewDate,
      }).success,
    ).toBe(valid);
  });

  it("permits no date only when it is optional", () => {
    const optional = action();
    const values = actionFormSchema(optional).parse(
      actionFormDefaults(optional),
    );
    expect(actionInput(optional, values)).toEqual({
      actionType: "PUT_ON_HOLD",
      scope: "TASK",
    });
    const mandatory = action(true);
    expect(
      actionFormSchema(mandatory).safeParse(actionFormDefaults(mandatory))
        .success,
    ).toBe(false);
  });

  it("defaults to an authorized wider scope and rejects a forged scope", () => {
    const hold = action();
    hold.requiredInput.holdScopes = ["STAGE"];
    expect(actionFormDefaults(hold).holdScope).toBe("STAGE");
    expect(
      actionFormSchema(hold).safeParse({
        ...actionFormDefaults(hold),
        holdScope: "APPLICATION",
      }).success,
    ).toBe(false);
    expect(
      workflowActionInputSchema.safeParse({
        actionType: "PUT_ON_HOLD",
        scope: "OTHER",
      }).success,
    ).toBe(false);
    expect(
      workflowActionInputSchema.safeParse({ actionType: "PUT_ON_HOLD" })
        .success,
    ).toBe(false);
  });

  it("submits the selected hold id when resuming and rejects an unrelated hold", () => {
    const resume = { ...action(), actionType: "RESUME" } as WorkflowTaskAction;
    const holdId = crypto.randomUUID();
    resume.requiredInput.resumableHolds = [
      {
        id: holdId,
        scope: "STAGE",
        heldAt: "2026-10-04T08:00:00Z",
        heldBy: "Reviewer",
        reviewAt: null,
        reason: null,
      },
    ];
    const values = actionFormSchema(resume).parse(actionFormDefaults(resume));
    expect(actionInput(resume, values)).toEqual({
      actionType: "RESUME",
      holdId,
    });
    expect(
      actionFormSchema(resume).safeParse({
        ...values,
        holdId: crypto.randomUUID(),
      }).success,
    ).toBe(false);
  });
});
