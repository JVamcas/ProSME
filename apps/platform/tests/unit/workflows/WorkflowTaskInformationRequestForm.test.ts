import { describe, expect, it } from "vitest";
import type { WorkflowTaskAction } from "@/modules/work-queue/TaskTypes";
import { emptyWorkflowActionInputMetadata } from "@/modules/workflows/domain/actions/WorkflowActionAvailability";
import {
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
