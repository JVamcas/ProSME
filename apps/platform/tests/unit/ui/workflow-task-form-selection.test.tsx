// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { afterEach, describe, expect, it } from "vitest";

import { WorkflowTaskDialogFields } from "@/modules/workflows/ui/definitions/WorkflowTaskDialogFields";
import type { WorkflowTaskFormValues } from "@/modules/workflows/ui/definitions/WorkflowTaskFormSchema";

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
      assignmentMode: "ROLE",
      assignmentTarget: "reviewer",
      checklistItems: [],
      coiRequired: false,
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
        formItems={formItems}
        formVersionId={formVersionId ?? ""}
        formsPending={formItems.length === 0}
        mutationPending={false}
        onActionKeysChange={() => undefined}
      />
    </FormProvider>
  );
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("workflow task form selection", () => {
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

    await act(async () => root.unmount());
  });
});
