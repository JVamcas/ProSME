import { describe, expect, it } from "vitest";
import type { WorkflowTaskAction } from "@/modules/work-queue/TaskTypes";
import { emptyWorkflowActionInputMetadata } from "@/modules/workflows/domain/actions/WorkflowActionAvailability";
import {
  actionFormDefaults,
  actionFormSchema,
  actionInput,
} from "@/modules/workflows/ui/tasks/WorkflowTaskActionForm";
import { validateActionInputAgainstConfiguration } from "@/modules/workflows/domain/actions/WorkflowActionExecution";
import { requestInformation } from "@/modules/workflows/domain/standard/StandardWorkflowBuilders";
import {
  workflowActionFormDefaults,
  toWorkflowActionDefinition,
} from "@/modules/workflows/ui/definitions/WorkflowActionFormMapping";

const action: WorkflowTaskAction = {
  actionType: "REQUEST_INFORMATION",
  available: true,
  key: "REQUEST_INFO",
  label: "Request information",
  presentation: { displayOrder: 1, variant: "outlineOrange" },
  requiredInput: {
    ...emptyWorkflowActionInputMetadata,
    editableFieldPaths: ["AMOUNT", "DESCRIPTION", "CLARIFICATION_RESPONSE"],
  },
  runtimeVersion: 1,
  unavailableReason: null,
};
const values = {
  confirmed: false,
  dataHandling: "RETAIN" as const,
  sourceTaskBehavior: "BLOCKED" as const,
  returnToReferrer: true,
  instructions: "Please correct the amount.",
  requestDetailedInformation: false,
  editableFieldPaths: ["AMOUNT"],
  question: "",
  reason: "",
  requestedDocumentRequirementIds: [],
  reviewDate: "" as const,
};

describe("per-request application field selection", () => {
  it("opens only the selected subset, without automatically requesting clarification", () => {
    const input = actionInput(action, actionFormSchema(action).parse(values));
    expect(input).toMatchObject({ editableFieldPaths: ["AMOUNT"] });
  });

  it("keeps written clarification separate from application fields", () => {
    expect(
      actionInput(action, { ...values, requestDetailedInformation: true }),
    ).toMatchObject({
      editableFieldPaths: ["AMOUNT", "CLARIFICATION_RESPONSE"],
    });
  });

  it("rejects empty requests but permits document-only requests", () => {
    expect(
      actionFormSchema(action).safeParse({ ...values, editableFieldPaths: [] })
        .success,
    ).toBe(false);
    expect(
      actionFormSchema(action).safeParse({
        ...values,
        editableFieldPaths: [],
        requestedDocumentRequirementIds: [crypto.randomUUID()],
      }).success,
    ).toBe(true);
  });

  it("uses applicant instructions without a separate reason, including legacy configurations", () => {
    const legacyAction = {
      ...action,
      requiredInput: {
        ...action.requiredInput,
        reason: { maxLength: 4_000, required: true },
      },
    };
    const parsed = actionFormSchema(legacyAction).parse(values);
    expect(
      actionInput(legacyAction, { ...parsed, reason: "Old hidden value" }),
    ).not.toHaveProperty("reason");
    const definition = requestInformation(
      "REQUEST_INFO",
      "Request information",
      1,
    );
    definition.reasonRequired = true;
    const input = actionInput(legacyAction, {
      ...parsed,
      editableFieldPaths: ["CLARIFICATION_RESPONSE"],
    });
    expect(
      validateActionInputAgainstConfiguration(definition, input, "REVIEW"),
    ).toBeNull();
    expect(
      toWorkflowActionDefinition({
        ...workflowActionFormDefaults(definition, 1),
        reasonRequired: true,
      }).reasonRequired,
    ).toBe(false);
  });

  it("does not restrict runtime selection to a legacy configured list", () => {
    const definition = requestInformation(
      "REQUEST_INFO",
      "Request information",
      1,
    );
    expect(
      validateActionInputAgainstConfiguration(
        definition,
        {
          actionType: "REQUEST_INFORMATION",
          editableFieldPaths: ["UNCONFIGURED"],
          instructions: "Correct this.",
          requestedDocumentRequirementIds: [],
        },
        "REVIEW",
      ),
    ).toBeNull();
  });

  it("saves close-request expiry and allows an empty field allowlist", () => {
    const definition = requestInformation(
      "REQUEST_INFO",
      "Request information",
      1,
    );
    const form = workflowActionFormDefaults(definition, 1);
    const updated = toWorkflowActionDefinition({
      ...form,
      editableFieldPaths: "",
      expiryAction: "ESCALATE",
    });
    expect(updated.configuration).toMatchObject({
      expiryAction: "CLOSE_REQUEST",
      editableFieldPaths: [],
    });
  });
});

describe("request information runtime response settings", () => {
  function configurableAction(
    flags = {
      deadlineDays: true,
      expiryAction: true,
      reminderDayOffsets: true,
    },
  ): WorkflowTaskAction {
    return {
      ...action,
      requiredInput: {
        ...action.requiredInput,
        requestInformationDeadline: {
          deadlineDays: 10,
          expiryAction: "CLOSE_REQUEST",
          reminderDayOffsets: [3, 7],
          runtimeOverrides: flags,
        },
      },
    };
  }

  it("prefills the definition defaults and sends only settings with enabled switches", () => {
    const current = configurableAction({
      deadlineDays: true,
      expiryAction: false,
      reminderDayOffsets: true,
    });
    expect(actionFormDefaults(current)).toMatchObject({
      deadlineDays: 10,
      expiryAction: "CLOSE_REQUEST",
      reminderDayOffsets: "3, 7",
    });
    expect(
      actionInput(current, {
        ...values,
        deadlineDays: 6,
        reminderDayOffsets: "2, 4",
        expiryAction: "CLOSE_REQUEST",
      }),
    ).toMatchObject({
      deadlineOverrides: { deadlineDays: 6, reminderDayOffsets: [2, 4] },
    });
    expect(
      actionInput(current, {
        ...values,
        deadlineDays: 6,
        reminderDayOffsets: "2, 4",
      }),
    ).not.toHaveProperty("deadlineOverrides.expiryAction");
  });

  it("lets staff clear enabled reminders", () => {
    const current = configurableAction();
    const parsed = actionFormSchema(current).parse({
      ...values,
      deadlineDays: 10,
      expiryAction: "CLOSE_REQUEST",
      reminderDayOffsets: "",
    });
    expect(actionInput(current, parsed)).toMatchObject({
      deadlineOverrides: { reminderDayOffsets: [] },
    });
  });

  it("keeps overrides absent when every switch is disabled", () => {
    const current = configurableAction({
      deadlineDays: false,
      expiryAction: false,
      reminderDayOffsets: false,
    });
    expect(actionInput(current, values)).not.toHaveProperty(
      "deadlineOverrides",
    );
  });

  it("rejects an unsupported expiry selection", () => {
    expect(
      actionFormSchema(configurableAction()).safeParse({
        ...values,
        deadlineDays: 10,
        expiryAction: "RETURN",
        reminderDayOffsets: "3, 7",
      }).success,
    ).toBe(false);
  });

  it.each(["2, 2", "0", "1.5", "2,", "3, 5"])(
    "validates runtime reminders %s against the effective deadline",
    (reminderDayOffsets) => {
      expect(
        actionFormSchema(configurableAction()).safeParse({
          ...values,
          deadlineDays: 5,
          expiryAction: "CLOSE_REQUEST",
          reminderDayOffsets,
        }).success,
      ).toBe(false);
    },
  );

  it("uses locked defaults for validation and serialization", () => {
    const current = configurableAction({
      deadlineDays: true,
      expiryAction: false,
      reminderDayOffsets: false,
    });
    expect(
      actionFormSchema(current).safeParse({
        ...values,
        deadlineDays: 5,
        reminderDayOffsets: "",
      }).success,
    ).toBe(false);
    expect(
      actionInput(current, {
        ...values,
        deadlineDays: 20,
        reminderDayOffsets: "1",
      }),
    ).toMatchObject({ deadlineOverrides: { deadlineDays: 20 } });
    expect(
      actionInput(current, {
        ...values,
        deadlineDays: 20,
        reminderDayOffsets: "1",
      }),
    ).not.toHaveProperty("deadlineOverrides.reminderDayOffsets");
  });
});
