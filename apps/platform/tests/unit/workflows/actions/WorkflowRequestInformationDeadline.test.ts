import { describe, expect, it } from "vitest";
import { requestInformation } from "@/modules/workflows/domain/standard/StandardWorkflowBuilders";
import { workflowActionDefinitionSchema } from "@/modules/workflows/domain/actions/WorkflowActionSchemas";
import {
  validateActionInputAgainstConfiguration,
  workflowActionInputSchema,
} from "@/modules/workflows/domain/actions/WorkflowActionExecution";
import { workflowActionInputMetadata } from "@/modules/workflows/domain/actions/WorkflowActionAvailability";
import {
  resolveWorkflowRfiDeadline,
  type WorkflowRfiRuntimeOverrides,
} from "@/modules/workflows/domain/actions/WorkflowRequestInformationDeadline";
import {
  toWorkflowActionDefinition,
  workflowActionFormDefaults,
} from "@/modules/workflows/ui/definitions/WorkflowActionFormMapping";
import { workflowActionFormSchema } from "@/modules/workflows/ui/definitions/WorkflowActionFormSchema";

const enabled: WorkflowRfiRuntimeOverrides = {
  deadlineDays: true,
  expiryAction: true,
  reminderDayOffsets: true,
};
const input = {
  actionType: "REQUEST_INFORMATION" as const,
  editableFieldPaths: ["AMOUNT"],
  instructions: "Correct the amount.",
  requestedDocumentRequirementIds: [],
};

function definition(runtimeOverrides?: WorkflowRfiRuntimeOverrides) {
  const action = requestInformation("REQUEST_INFO", "Request information", 1);
  if (action.actionType !== "REQUEST_INFORMATION")
    throw new Error("Invalid fixture");
  action.configuration.runtimeOverrides = runtimeOverrides;
  action.configuration.editableFieldPaths = [];
  return action;
}

describe("request information deadline overrides", () => {
  it("keeps legacy definitions readable, with overrides disabled", () => {
    const action = definition();
    expect(workflowActionDefinitionSchema.safeParse(action).success).toBe(true);
    expect(resolveWorkflowRfiDeadline(action.configuration)).toEqual({
      success: true,
      data: {
        deadlineDays: 10,
        expiryAction: "CLOSE_REQUEST",
        reminderDayOffsets: [3, 7],
      },
    });
    expect(workflowActionFormDefaults(action, 1).runtimeOverrides).toEqual({
      deadlineDays: false,
      expiryAction: false,
      reminderDayOffsets: false,
    });
  });

  it("round trips independent switches and exposes defaults to the task form", () => {
    const flags = { ...enabled, expiryAction: false };
    const action = definition(flags);
    expect(
      toWorkflowActionDefinition(workflowActionFormDefaults(action, 1)),
    ).toEqual(action);
    expect(
      workflowActionInputMetadata(action).requestInformationDeadline,
    ).toEqual({
      deadlineDays: 10,
      expiryAction: "CLOSE_REQUEST",
      reminderDayOffsets: [3, 7],
      runtimeOverrides: flags,
    });
  });

  it.each([
    { deadlineDays: 20 },
    { expiryAction: "CLOSE_REQUEST" as const },
    { reminderDayOffsets: [] },
  ])(
    "denies a supplied override when its switch is absent or disabled: %j",
    (overrides) => {
      for (const flags of [
        undefined,
        { deadlineDays: false, expiryAction: false, reminderDayOffsets: false },
      ]) {
        expect(
          validateActionInputAgainstConfiguration(
            definition(flags),
            { ...input, deadlineOverrides: overrides },
            "REVIEW",
          ),
        ).toContain("cannot be overridden");
      }
    },
  );

  it("combines allowed overrides with locked defaults without changing the definition", () => {
    const action = definition({ ...enabled, expiryAction: false });
    const before = structuredClone(action);
    expect(
      resolveWorkflowRfiDeadline(action.configuration, {
        deadlineDays: 6,
        reminderDayOffsets: [2, 4],
      }),
    ).toEqual({
      success: true,
      data: {
        deadlineDays: 6,
        expiryAction: "CLOSE_REQUEST",
        reminderDayOffsets: [2, 4],
      },
    });
    expect(action).toEqual(before);
    expect(
      resolveWorkflowRfiDeadline(action.configuration, {
        reminderDayOffsets: [],
      }),
    ).toMatchObject({ success: true, data: { reminderDayOffsets: [] } });
  });

  it("rejects a shorter deadline when the locked reminders fall after it", () => {
    const error = validateActionInputAgainstConfiguration(
      definition({ ...enabled, reminderDayOffsets: false }),
      { ...input, deadlineOverrides: { deadlineDays: 5 } },
      "REVIEW",
    );
    expect(error).toBe("Reminder days must fall before the deadline.");
  });

  it.each([
    { deadlineDays: 0 },
    { deadlineDays: 366 },
    { deadlineDays: 2.5 },
    { deadlineDays: 5, reminderDayOffsets: [5] },
    { reminderDayOffsets: [3, 3] },
    { reminderDayOffsets: [0] },
    { reminderDayOffsets: [1.5] },
    { reminderDayOffsets: Array.from({ length: 21 }, (_, index) => index + 1) },
  ])("rejects invalid effective settings: %j", (overrides) => {
    expect(
      resolveWorkflowRfiDeadline(definition(enabled).configuration, overrides)
        .success,
    ).toBe(false);
  });

  it.each(["ESCALATE", "RETURN"])(
    "does not introduce selectable %s expiry",
    (expiryAction) => {
      expect(
        workflowActionInputSchema.safeParse({
          ...input,
          deadlineOverrides: { expiryAction },
        }).success,
      ).toBe(false);
      const action = definition(enabled);
      action.configuration.expiryAction = expiryAction as "ESCALATE" | "RETURN";
      expect(resolveWorkflowRfiDeadline(action.configuration)).toMatchObject({
        success: true,
        data: { expiryAction },
      });
      expect(
        resolveWorkflowRfiDeadline(action.configuration, {
          expiryAction: "CLOSE_REQUEST",
        }),
      ).toMatchObject({
        success: true,
        data: { expiryAction: "CLOSE_REQUEST" },
      });
    },
  );

  it("rejects malformed reminder defaults in the designer", () => {
    const values = workflowActionFormDefaults(definition(), 1);
    for (const reminderDayOffsets of ["3, 3", "3,", "7, 10", "0", "1.5"]) {
      expect(
        workflowActionFormSchema.safeParse({ ...values, reminderDayOffsets })
          .success,
      ).toBe(false);
    }
  });
});
