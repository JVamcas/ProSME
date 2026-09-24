// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { afterEach, describe, expect, it } from "vitest";

import { WorkflowTaskDialogFields } from "@/modules/workflows/ui/definitions/WorkflowTaskDialogFields";
import { workflowTaskFormItems } from "@/modules/workflows/ui/definitions/WorkflowTaskDialogController";
import type { WorkflowTaskFormValues } from "@/modules/workflows/ui/definitions/WorkflowTaskFormSchema";
import { defaultWorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";

const attachedVersionId = "68cecb68-3f4f-4862-a958-92942187cf04";

(globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

function TaskFields({
  formItems,
}: {
  formItems: { label: string; value: string }[];
}) {
  const form = useForm<WorkflowTaskFormValues>({
    defaultValues: {
      actionKeys: [],
      viewPermission: defaultWorkflowElementPermissions.view,
      editPermission: defaultWorkflowElementPermissions.edit,
      decidePermission: defaultWorkflowElementPermissions.decide,
      visibility: defaultWorkflowElementPermissions.visibility,
      assignmentMode: "ROLE",
      assignmentTarget: "reviewer",
      checklistItems: [],
      coiRequired: false,
      contextFields: [{
        key: "application.requested_amount",
        label: "Requested amount",
        type: "NUMBER",
      }],
      description: "",
      displayOrder: 1,
      formVersionId: attachedVersionId,
      name: "Finance Review",
      quorum: false,
      required: true,
      requiredCompletionCount: 1,
      reviewerCount: 1,
      stableKey: "FINANCE_REVIEW",
    },
  });
  const formVersionId = useWatch({
    control: form.control,
    name: "formVersionId",
  });

  return (
    <FormProvider {...form}>
      <WorkflowTaskDialogFields
        actionItems={[]}
        actionKeys={[]}
        assignmentItems={[{ label: "Reviewer", value: "reviewer" }]}
        assignmentMode="ROLE"
        contextFieldItems={[{
          key: "application.requested_amount",
          label: "Requested amount",
          type: "NUMBER",
        }]}
        contextFieldKeys={["application.requested_amount"]}
        contextFieldsPending={false}
        formItems={formItems}
        formVersionId={formVersionId ?? ""}
        formsPending={formItems.length === 0}
        mutationPending={false}
        onActionKeysChange={() => undefined}
        onContextFieldKeysChange={() => undefined}
      />
    </FormProvider>
  );
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("workflow task form selection", () => {
  it("shows a stored unavailable binding instead of claiming no form is selected", () => {
    expect(workflowTaskFormItems([], attachedVersionId)).toEqual([{
      label: "Unavailable form version — remove or replace",
      value: attachedVersionId,
    }]);
  });

  it("retains the attached form while published-form options load", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => root.render(<TaskFields formItems={[]} />));
    await act(async () => root.render(
      <TaskFields
        formItems={[{
          label: "Finance Assessment · v1",
          value: attachedVersionId,
        }]}
      />,
    ));

    const formSelect = container.querySelector<HTMLSelectElement>(
      'select[name="formVersionId"]',
    );
    expect(formSelect?.value).toBe(attachedVersionId);
    expect(container.querySelector<HTMLSelectElement>(
      "#workflow-context-fields-values",
    )?.value).toBe("application.requested_amount");
    expect(container.textContent).toContain(
      "Requested amount · application.requested_amount",
    );
    expect(container.textContent).toContain("Element permissions");
    expect(container.textContent).toContain("View permission");
    expect(container.textContent).toContain("Edit permission");
    expect(container.textContent).toContain("Decide permission");
    expect(container.querySelector<HTMLSelectElement>(
      'select[name="visibility"]',
    )?.value).toBe("INTERNAL_ONLY");

    await act(async () => root.unmount());
  });
});
