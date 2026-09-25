// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { afterEach, describe, expect, it } from "vitest";

import { WorkflowTaskDialogFields } from "@/modules/workflows/ui/definitions/WorkflowTaskDialogFields";
import { workflowTaskFormItems } from "@/modules/workflows/ui/definitions/WorkflowTaskDialogController";
import type { WorkflowTaskFormValues } from "@/modules/workflows/ui/definitions/WorkflowTaskFormSchema";

const attachedVersionId = "68cecb68-3f4f-4862-a958-92942187cf04";

(globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

function TaskFields({
  completionMode = "COUNT",
  formItems,
}: {
  completionMode?: WorkflowTaskFormValues["completionMode"];
  formItems: { label: string; value: string }[];
}) {
  const form = useForm<WorkflowTaskFormValues>({
    defaultValues: {
      assignmentMode: "ROLE",
      assignmentTarget: "reviewer",
      completionMode,
      completionPercentage: completionMode === "PERCENT" ? 75 : null,
      description: "",
      displayOrder: 1,
      formVersionId: attachedVersionId,
      formPurpose: "APPLICATION_REVIEW",
      name: "Finance Review",
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
        assignmentItems={[{ label: "Reviewer", value: "reviewer" }]}
        assignmentMode="ROLE"
        formItems={formItems}
        formVersionId={formVersionId ?? ""}
        formPurpose="APPLICATION_REVIEW"
        formsPending={formItems.length === 0}
        mutationPending={false}
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

  it("only offers published forms with the selected purpose", () => {
    const forms = [
      {
        definitionId: "10000000-0000-4000-8000-000000000001",
        formName: "Application",
        purpose: "FUNDING_APPLICATION" as const,
        versionId: "20000000-0000-4000-8000-000000000001",
        versionNumber: 1,
      },
      {
        definitionId: "10000000-0000-4000-8000-000000000002",
        formName: "Review",
        purpose: "APPLICATION_REVIEW" as const,
        versionId: "20000000-0000-4000-8000-000000000002",
        versionNumber: 1,
      },
    ];
    expect(workflowTaskFormItems(
      forms,
      "",
      true,
      "APPLICATION_REVIEW",
    )).toEqual([{
      label: "Review · v1",
      value: forms[1].versionId,
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
    expect(container.textContent).not.toContain("Read-only runtime context");
    expect(container.textContent).not.toContain("Element permissions");
    expect(container.textContent).not.toContain("Require quorum");
    expect(container.textContent).not.toContain(
      "Require conflict-of-interest clearance",
    );

    await act(async () => root.unmount());
  });

  it("shows the value field required by the completion mode", async () => {
    const countContainer = document.createElement("div");
    const percentageContainer = document.createElement("div");
    document.body.append(countContainer, percentageContainer);
    const countRoot = createRoot(countContainer);
    const percentageRoot = createRoot(percentageContainer);

    await act(async () => countRoot.render(<TaskFields formItems={[]} />));
    await act(async () => percentageRoot.render(
      <TaskFields completionMode="PERCENT" formItems={[]} />,
    ));

    expect(countContainer.textContent).toContain("Required completions");
    expect(countContainer.textContent).not.toContain("Completion percentage");
    expect(percentageContainer.textContent).toContain("Completion percentage");
    expect(percentageContainer.textContent).not.toContain("Required completions");

    await act(async () => countRoot.unmount());
    await act(async () => percentageRoot.unmount());
  });
});
